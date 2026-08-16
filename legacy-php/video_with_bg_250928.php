<?php
// === Eingabe prüfen ===
if (!isset($_GET['file']) || empty($_GET['file'])) {
    die("Kein Video angegeben. Beispiel: video_with_bg.php?file=meinvideo.mp4");
}

$videoFile = basename($_GET['file']);
$videoPath = __DIR__ . "/videos/" . $videoFile;

if (!file_exists($videoPath)) {
    die("Video nicht gefunden: " . htmlspecialchars($videoFile));
}

// Orientation prüfen
if (isset($_GET['orientation']) && in_array($_GET['orientation'], ['portrait', 'landscape'])) {
    $isPortrait = $_GET['orientation'] === 'portrait';
} else {
    $cmd = "ffprobe -v error -select_streams v:0 -show_entries stream=width,height "
         . "-of csv=p=0:s=x " . escapeshellarg($videoPath);

    $output = shell_exec($cmd);
    if (!$output) {
        die("Fehler: Konnte Videoabmessungen nicht auslesen.");
    }

    list($videoWidth, $videoHeight) = explode("x", trim($output));
    $isPortrait = $videoHeight > $videoWidth;
}

// Hintergrund wählen
$bgFile = $isPortrait ? "bg_portrait.png" : "bg_landscape.png";
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

   <video id="myVideo" autoplay playsinline>
    <source src="videos/<?= htmlspecialchars($videoFile) ?>" type="video/mp4">
    Dein Browser unterstützt das Video-Tag nicht.
</video>

<script>
const vid = document.getElementById("myVideo");

// Versuche sofort zu starten
vid.autoplay = true;
vid.muted = false;
vid.play().catch(err => {
    console.log("Autoplay mit Ton blockiert:", err);
});
</script>



</div>
</body>
</html>
