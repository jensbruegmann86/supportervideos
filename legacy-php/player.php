<?php
// DB-Verbindung
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";
$pdo = new PDO($dsn, $user, $pass);

// Prüfen ob Player schon busy ist
$state = $pdo->query("SELECT busy FROM player_state WHERE id=1")->fetch(PDO::FETCH_ASSOC);
if ($state && $state['busy'] == 1) {
    echo "Player ist busy – kein Video gestartet.";
    exit;
}

// Nächstes freies Video suchen
$stmt = $pdo->query("SELECT id, bib, videoname, orientation 
                     FROM event_video 
                     WHERE ready = 1 
                       AND played = 0 
                       AND approved = 1
                       AND trash = 0
                       AND detection_time IS NOT NULL
                     ORDER BY detection_time DESC 
                     LIMIT 1");
$video = $stmt->fetch(PDO::FETCH_ASSOC);

if ($video) {
    $bib = $video['bib'];
    $stmtAll = $pdo->prepare("SELECT id, videoname, orientation
                              FROM event_video
                              WHERE ready = 1 
                                AND played = 0
                                AND approved = 1
                                AND trash = 0
                                AND bib = ?
                              ORDER BY video_count ASC");
    $stmtAll->execute([$bib]);
    $videos = $stmtAll->fetchAll(PDO::FETCH_ASSOC);
}

if (!$video) {
    ?>
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <title>Warten auf Video</title>
        <meta http-equiv="refresh" content="1">
    </head>
    <body style="background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;">
        <h2>Kein Video in der Queue...</h2>
    </body>
    </html>
    <?php
    exit;
}

// Player auf busy setzen
$pdo->query("UPDATE player_state SET busy = 1 WHERE id=1");

// Erstes Video sofort als „gespielt“ markieren
$update = $pdo->prepare("UPDATE event_video SET played = 1 WHERE id = ?");
$update->execute([$video['id']]);

// Orientation für Startvideo
$isPortrait = ($video['orientation'] === 'portrait');
$bgFile = $isPortrait ? "bg_portrait.png" : "bg_landscape.png";
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Video Player</title>
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
<div class="container" id="container">
    <video id="myVideo" autoplay playsinline>
        <source src="video_stream.php?file=<?= urlencode($videos[0]['videoname']) ?>" type="video/mp4">
    </video>
</div>

<script>
const playlist = <?= json_encode($videos) ?>; // enthält jetzt videoname + orientation
let current = 0;
const vid = document.getElementById("myVideo");
const container = document.getElementById("container");

function applyOrientation(orientation) {
    if (orientation === "portrait") {
        container.style.backgroundImage = "url('backgrounds/bg_portrait.png')";
        vid.style.width = "610px";
        vid.style.height = "1080px";
        vid.style.left = "50%";
        vid.style.top = "0";
        vid.style.transform = "translateX(-50%)";
    } else {
        container.style.backgroundImage = "url('backgrounds/bg_landscape.png')";
        vid.style.width = "1436px";
        vid.style.height = "807px";
        vid.style.left = "0";
        vid.style.top = "0";
        vid.style.transform = "none";
    }
}

// Erste Orientierung anwenden
applyOrientation(playlist[0].orientation);

vid.addEventListener("ended", () => {
    current++;
    if (current < playlist.length) {
        const nextVideo = playlist[current];
        vid.src = "video_stream.php?file=" + encodeURIComponent(nextVideo.videoname);
        applyOrientation(nextVideo.orientation);
        vid.play();
    } else {
        // Alle Videos gespielt → Player freigeben
        fetch("release_player.php?ids=<?= implode(',', array_column($videos,'id')) ?>")
            .then(() => location.reload());
    }
});
</script>
</body>
</html>
