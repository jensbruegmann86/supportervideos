<?php
// video_with_bg.php - Abspielen eines einzelnen Videos mit Background und Rückgabe an player.php

// === Eingabe prüfen ===
if (!isset($_GET['file']) || empty($_GET['file'])) {
    die("Kein Video angegeben. Beispiel: video_with_bg.php?file=2844-1.mp4&orientation=portrait");
}

$videoFile = basename($_GET['file']); // Dateiname sichern
// optional: ids (z.B. ids=12,13) oder id (einzelne id) weiterreichen
$idsParam = isset($_GET['ids']) ? $_GET['ids'] : (isset($_GET['id']) ? $_GET['id'] : null);

// Orientation prüfen (aus URL-Parameter)
if (isset($_GET['orientation']) && in_array($_GET['orientation'], ['portrait', 'landscape'])) {
    $isPortrait = $_GET['orientation'] === 'portrait';
} else {
    // Fallback: landscape
    $isPortrait = false;
}

// Hintergrundgrafik auswählen
$bgFile = $isPortrait ? "bg_portrait.png" : "bg_landscape.png";

// MIME-Type anhand Dateiendung bestimmen
function getMimeType($filename) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    switch ($ext) {
        case 'mp4': return 'video/mp4';
        case 'mov': return 'video/quicktime';
        case 'avi': return 'video/x-msvideo';
        case 'mkv': return 'video/x-matroska';
        default: return 'application/octet-stream';
    }
}
$mimeType = getMimeType($videoFile);
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Video mit Background</title>
<style>
    body, html {
        margin: 0;
        padding: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        background-color: white;
    }

    .container {
        position: relative;
        width: 1920px;
        height: 1080px;
        background: url('backgrounds/<?= htmlspecialchars($bgFile) ?>') no-repeat center center;
        background-size: cover;
    }

    video {
        position: absolute;
        object-fit: cover;
    }
</style>
</head>
<body>
<div class="container" id="container">
    <video id="myVideo" autoplay playsinline>
        <source src="video_stream.php?file=<?= rawurlencode($videoFile) ?>" type="<?= $mimeType ?>">
        Dein Browser unterstützt das Video-Tag nicht.
    </video>
</div>

<script>
// JS: Playback, Release und Redirect
const vid = document.getElementById('myVideo');

// Anzahl gewünschter Wiederholungen (falls gewünscht)
// setze maxPlays = 1 für einfaches einmal abspielen
let playCount = 0;
const maxPlays = 1; // Anzahl der Durchläufe (1 = einmal abspielen)

// ids kommen aus PHP (optional)
const phpIds = <?= json_encode($idsParam) ?>;

// Hilfsfunktion: release aufrufen und dann zurück zu player.php
function releaseAndReturn() {
    // bestimme Release-URL (falls ids vorhanden -> mit anhängen)
    let url = 'release_player.php';
    if (phpIds) {
        // Anhängen als Query-String, release_player kann ids verarbeiten
        url += '?ids=' + encodeURIComponent(phpIds);
    }

    // POST/GET - wir verwenden fetch GET mit Cache-Buster, falls notwendig
    fetch(url, { method: 'POST', cache: 'no-store' })
    .then(response => {
        // Optional: prüfe response.ok
        setTimeout(() => {
            // Nach erfolgreichem Release zurück zum Player
            window.location.href = 'player.php?ts=' + Date.now();
        }, 400); // kleine Verzögerung, damit DB-Update abgeschlossen ist
    })
    .catch(err => {
        console.error('Release-Request fehlgeschlagen:', err);
        // trotzdem zurück zum Player - besser als stehen bleiben
        window.location.href = 'player.php?ts=' + Date.now();
    });
}

// Event: Ende des Videos
vid.addEventListener('ended', () => {
    playCount++;
    if (playCount < maxPlays) {
        vid.currentTime = 0;
        vid.play();
        return;
    }
    // Nach vollständigem Abspielen Release + Redirect
    releaseAndReturn();
});

// Sicherheit: falls autoplay blockiert oder Video nicht startet, versuche play()
vid.play().catch(err => {
    console.warn('Autoplay möglicherweise blockiert:', err);
    // optional: zeige Play-Button oder versuche stumm starten
});
</script>
</body>
</html>
