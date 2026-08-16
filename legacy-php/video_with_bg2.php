<?php
// === Eingabe prüfen ===
if (!isset($_GET['file']) || empty($_GET['file'])) {
    die("Kein Video angegeben. Beispiel: video_with_bg.php?file=2844-1.mp4&orientation=portrait");
}

$videoFile = basename($_GET['file']); // Dateiname sichern

// Orientation prüfen (aus DB oder URL-Parameter)
if (isset($_GET['orientation']) && in_array($_GET['orientation'], ['portrait', 'landscape'])) {
    $isPortrait = $_GET['orientation'] === 'portrait';
} else {
    // Standard fallback
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
        background: url('backgrounds/<?= $bgFile ?>') no-repeat center center;
        background-size: cover;
    }

    video {
        position: absolute;
        <?php if ($isPortrait): ?>
            width: 610px;
            height: 1080px;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
        <?php else: ?>
            width: 1436px;
            height: 807px;
            left: 0;
            top: 0;
        <?php endif; ?>
        object-fit: cover;
    }
</style>
</head>
<body>
<div class="container">

<video id="myVideo" autoplay playsinline controls>
    <source src="stream_hidrive.php?file=<?= rawurlencode($videoFile) ?>" type="<?= $mimeType ?>">
    Dein Browser unterstützt das Video-Tag nicht.
</video>

<script>
const vid = document.getElementById("myVideo");
let playCount = 0;
const maxPlays = 2; // Anzahl der Wiederholungen

vid.autoplay = true;
vid.muted = false;

// Event-Listener für Ende des Videos
vid.addEventListener('ended', () => {
    playCount++;
    if (playCount < maxPlays) {
        vid.currentTime = 0;
        vid.play();
    }
});
</script>



</div>
</body>
</html>
