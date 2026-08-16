# Video Upload 2026 – Next.js / Supabase / Vercel

Migration des bisherigen PHP+MySQL+HiDrive-Setups (siehe `legacy-php/`) auf einen
Stack, der sich direkt über Git nach Vercel deployen lässt und Supabase
(Postgres + Storage) als Backend nutzt.

## Funktionen

1. **Teilnehmerimport** – `GET /api/participants/import` lädt die CSV-Teilnehmerliste
   (Name, Vorname, Startnummer) vom Zeitmessungs-Anbieter und schreibt sie nach
   `event_participants`. Läuft einmal täglich per Vercel Cron (`vercel.json`,
   Hobby-Plan erlaubt max. 1 Cron-Lauf/Tag) oder manuell via `?key=IMPORT_JOB_SECRET`.
2. **Suche & Upload** – `/` sucht Teilnehmer, `/upload?bib=...` lädt ein Video
   direkt (signierte URL) in den Supabase-Storage-Bucket hoch, Metadaten landen
   in `event_video`.
3. **Upload-Kriterien** – Größe/Dauer werden im Browser vor dem Upload geprüft
   (`MAX_UPLOAD_MB`, `MAX_UPLOAD_SECONDS`), serverseitig wird die Dauer erneut
   grob validiert. Die Ausrichtung (Hoch-/Querformat) wird aus den Video-Metadaten
   des Browsers bestimmt.
4. **Freigabe-Backend** – `/admin` (geschützt durch `ADMIN_PASSWORD`) zeigt offene
   Videos, erlaubt Freigabe oder Löschen (inkl. Storage-Datei).
5. **Player** – `/player/1` und `/player/2` pollen `GET /api/player/next` und
   spielen freigegebene Videos im 16:9-Rahmen (`public/backgrounds/bg_landscape_1080.png`).
   Ein Zeitmess-Push (`POST /api/timing/webhook`) markiert Videos als startbereit.
6. **Abspiel-Log** – `video_play_log` hält fest, wann ein Video auf welchem Screen
   abgespielt wurde.

### Zwei-Screen-Logik (Zusatzidee)

`POST /api/timing/webhook` mit `{ "bib": "1234", "screen_id": 1 }`:

- Video wird sofort für Screen 1 in die Queue gestellt.
- Zusätzlich wird automatisch ein Eintrag für Screen 2 angelegt, der erst nach
  `SCREEN2_DELAY_SECONDS` (Default 8s, an den ca. 30m Streckenversatz anpassen)
  abspielbereit ist.

Gibt es eine echte zweite Zeitmessmatte 30m weiter, kann diese direkt mit
`screen_id: 2` pushen – dann entfällt die künstliche Verzögerung, da die
tatsächliche Laufzeit des Teilnehmers den Versatz erzeugt.

Ein Screen ist während der Wiedergabe "busy" (`player_state.busy`) und wird erst
nach dem letzten Clip der Playlist wieder freigegeben
(`POST /api/player/release`).

## Setup

### 1. Supabase

1. Neues Projekt anlegen.
2. SQL-Editor öffnen und `supabase/schema.sql` ausführen.
3. Unter **Storage** einen Bucket `videos` (privat) anlegen – Name muss zu
   `SUPABASE_VIDEO_BUCKET` passen.
4. API-Keys aus **Project Settings → API** kopieren: `URL`, `anon public key`,
   `service_role key`.

### 2. Lokale Konfiguration

```bash
cp .env.example .env.local
# Werte eintragen: Supabase-Keys, ADMIN_PASSWORD, ADMIN_SESSION_SECRET, ...
npm install
npm run dev
```

### 3. Git + Vercel

```bash
git init
git add .
git commit -m "Initial Next.js/Supabase migration"
git remote add origin <dein-repo>
git push -u origin main
```

In Vercel: Projekt aus dem Repo importieren, alle Variablen aus `.env.example`
unter **Project Settings → Environment Variables** eintragen (Produktions- und
Preview-Umgebung). Vercel baut und deployed automatisch bei jedem Push.

## Wichtige Hinweise / offene Punkte

- **Datei-Uploads laufen direkt zum Storage-Bucket** (signierte Upload-URL),
  nicht über eine Serverless-Function-Body – das umgeht das
  Vercel-Request-Body-Limit (ca. 4,5 MB) und funktioniert auch für größere
  Videodateien.
- **Video-Validierung** (Dauer, Format) erfolgt aktuell client-seitig über die
  HTML5-Video-Metadaten. Es gibt kein `ffprobe` auf Vercel-Serverless-Functions;
  für eine harte serverseitige Prüfung müsste ein separater Verify-Schritt
  (z. B. Supabase Edge Function mit `ffmpeg.wasm`, oder ein kleiner externer
  Dienst) ergänzt werden.
- **Querformat-Pflicht**: aktuell wird die Ausrichtung nur erkannt und
  gespeichert (`orientation`), aber nicht erzwungen. Um künftig nur noch
  Querformat zuzulassen, im Upload-Formular (`app/upload/page.js`) bei
  `meta.orientation === "portrait"` einen Fehler ausgeben statt den Upload
  fortzusetzen.
- **Admin-Login** ist bewusst simpel gehalten (ein gemeinsames Passwort +
  signierter Cookie). Für mehrere Benutzer/Rollen bietet sich Supabase Auth an.
- **Timing-Anbindung**: `poller.php` (Dauerschleife) entfällt – stattdessen soll
  das Zeitmesssystem selbst per POST auf `/api/timing/webhook` pushen. Falls nur
  ein CSV-Endpunkt zur Verfügung steht, kann ein kleiner externer Cron/Worker
  die CSV weiterhin abfragen und bei neuen Startnummern den Webhook aufrufen.
- **Vercel Hobby-Plan**: Cron Jobs sind auf 1 Ausführung/Tag begrenzt (siehe
  `vercel.json`, aktuell `0 4 * * *`). Für häufigere Imports entweder auf den
  Pro-Plan upgraden oder den Import extern anstoßen (z. B. GitHub Actions
  Schedule, das `?key=IMPORT_JOB_SECRET` aufruft).
- Der alte PHP/MySQL/HiDrive-Code liegt unverändert unter `legacy-php/` zur
  Referenz und wird nicht mehr deployed.

## Projektstruktur

```
app/                     Next.js App Router (Seiten + API-Routen)
lib/                     Supabase-Clients, Auth-Helper
public/backgrounds/      16:9-Rahmenbilder für den Player
supabase/schema.sql       Datenbankschema für Supabase
legacy-php/               Ursprüngliches PHP-Projekt (Referenz, nicht deployed)
```
