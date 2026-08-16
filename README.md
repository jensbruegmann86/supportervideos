# Video Upload 2026 – Next.js / Supabase / Vercel

Migration des bisherigen PHP+MySQL+HiDrive-Setups (siehe `legacy-php/`) auf einen
Stack, der sich direkt über Git nach Vercel deployen l\u00e4sst und Supabase
(Postgres + Storage) als Backend nutzt.

## Funktionen

1. **Teilnehmerimport** – `GET /api/participants/import` l\u00e4dt die CSV-Teilnehmerliste
   (Name, Vorname, Startnummer) vom Zeitmessungs-Anbieter und schreibt sie nach
   `event_participants`. L\u00e4uft per Vercel Cron alle 15 Minuten (`vercel.json`)
   oder manuell via `?key=IMPORT_JOB_SECRET`.
2. **Suche & Upload** – `/` sucht Teilnehmer, `/upload?bib=...` l\u00e4dt ein Video
   direkt (signierte URL) in den Supabase-Storage-Bucket hoch, Metadaten landen
   in `event_video`.
3. **Upload-Kriterien** – Gr\u00f6\u00dfe/Dauer werden im Browser vor dem Upload gepr\u00fcft
   (`MAX_UPLOAD_MB`, `MAX_UPLOAD_SECONDS`), serverseitig wird die Dauer erneut
   grob validiert. Die Ausrichtung (Hoch-/Querformat) wird aus den Video-Metadaten
   des Browsers bestimmt.
4. **Freigabe-Backend** – `/admin` (gesch\u00fctzt durch `ADMIN_PASSWORD`) zeigt offene
   Videos, erlaubt Freigabe oder L\u00f6schen (inkl. Storage-Datei).
5. **Player** – `/player/1` und `/player/2` pollen `GET /api/player/next` und
   spielen freigegebene Videos im 16:9-Rahmen (`public/backgrounds/bg_landscape_1080.png`).
   Ein Zeitmess-Push (`POST /api/timing/webhook`) markiert Videos als startbereit.
6. **Abspiel-Log** – `video_play_log` h\u00e4lt fest, wann ein Video auf welchem Screen
   abgespielt wurde.

### Zwei-Screen-Logik (Zusatzidee)

`POST /api/timing/webhook` mit `{ "bib": "1234", "screen_id": 1 }`:

- Video wird sofort f\u00fcr Screen 1 in die Queue gestellt.
- Zus\u00e4tzlich wird automatisch ein Eintrag f\u00fcr Screen 2 angelegt, der erst nach
  `SCREEN2_DELAY_SECONDS` (Default 8s, an den ca. 30m Streckenversatz anpassen)
  abspielbereit ist.

Gibt es eine echte zweite Zeitmessmatte 30m weiter, kann diese direkt mit
`screen_id: 2` pushen – dann entf\u00e4llt die k\u00fcnstliche Verz\u00f6gerung, da die
tats\u00e4chliche Laufzeit des Teilnehmers den Versatz erzeugt.

Ein Screen ist w\u00e4hrend der Wiedergabe "busy" (`player_state.busy`) und wird erst
nach dem letzten Clip der Playlist wieder freigegeben
(`POST /api/player/release`).

## Setup

### 1. Supabase

1. Neues Projekt anlegen.
2. SQL-Editor \u00f6ffnen und `supabase/schema.sql` ausf\u00fchren.
3. Unter **Storage** einen Bucket `videos` (privat) anlegen – Name muss zu
   `SUPABASE_VIDEO_BUCKET` passen.
4. API-Keys aus **Project Settings \u2192 API** kopieren: `URL`, `anon public key`,
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
unter **Project Settings \u2192 Environment Variables** eintragen (Produktions- und
Preview-Umgebung). Vercel baut und deployed automatisch bei jedem Push.

## Wichtige Hinweise / offene Punkte

- **Datei-Uploads laufen direkt zum Storage-Bucket** (signierte Upload-URL),
  nicht \u00fcber eine Serverless-Function-Body – das umgeht das
  Vercel-Request-Body-Limit (ca. 4,5 MB) und funktioniert auch f\u00fcr gr\u00f6\u00dfere
  Videodateien.
- **Video-Validierung** (Dauer, Format) erfolgt aktuell client-seitig \u00fcber die
  HTML5-Video-Metadaten. Es gibt kein `ffprobe` auf Vercel-Serverless-Functions;
  f\u00fcr eine harte serverseitige Pr\u00fcfung m\u00fcsste ein separater Verify-Schritt
  (z. B. Supabase Edge Function mit `ffmpeg.wasm`, oder ein kleiner externer
  Dienst) erg\u00e4nzt werden.
- **Querformat-Pflicht**: aktuell wird die Ausrichtung nur erkannt und
  gespeichert (`orientation`), aber nicht erzwungen. Um k\u00fcnftig nur noch
  Querformat zuzulassen, im Upload-Formular (`app/upload/page.js`) bei
  `meta.orientation === "portrait"` einen Fehler ausgeben statt den Upload
  fortzusetzen.
- **Admin-Login** ist bewusst simpel gehalten (ein gemeinsames Passwort +
  signierter Cookie). F\u00fcr mehrere Benutzer/Rollen bietet sich Supabase Auth an.
- **Timing-Anbindung**: `poller.php` (Dauerschleife) entf\u00e4llt – stattdessen soll
  das Zeitmesssystem selbst per POST auf `/api/timing/webhook` pushen. Falls nur
  ein CSV-Endpunkt zur Verf\u00fcgung steht, kann ein kleiner externer Cron/Worker
  die CSV weiterhin abfragen und bei neuen Startnummern den Webhook aufrufen.
- Der alte PHP/MySQL/HiDrive-Code liegt unver\u00e4ndert unter `legacy-php/` zur
  Referenz und wird nicht mehr deployed.

## Projektstruktur

```
app/                     Next.js App Router (Seiten + API-Routen)
lib/                     Supabase-Clients, Auth-Helper
public/backgrounds/      16:9-Rahmenbilder f\u00fcr den Player
supabase/schema.sql       Datenbankschema f\u00fcr Supabase
legacy-php/               Ursprüngliches PHP-Projekt (Referenz, nicht deployed)
```
