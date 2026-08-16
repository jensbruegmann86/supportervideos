<?php
// DB-Verbindung
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";
$pdo = new PDO($dsn, $user, $pass);

// Prüfen ob Player busy ist
$state = $pdo->query("SELECT busy FROM player_state WHERE id=1")->fetch(PDO::FETCH_ASSOC);
if ($state && $state['busy'] == 1) {
    echo "Player ist busy – kein Video gestartet.";
    exit;
}

// Nächstes freies Video suchen
$stmt = $pdo->query("SELECT id, videoname, orientation 
                     FROM event_video 
                     WHERE ready = 1 
                       AND played = 0 
                       AND approved = 1
                       AND trash = 0
                       AND detection_time IS NOT NULL
                     ORDER BY detection_time DESC 
                     LIMIT 1");
$video = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$video) {
    // Kein Video → Warten/Reload
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

// Video als gespielt markieren
$update = $pdo->prepare("UPDATE event_video SET played = 1, played_time = NOW() WHERE id = ?");
$update->execute([$video['id']]);

// Weiterleitung zum eigentlichen Video-Player
$videoname   = urlencode($video['videoname']);
$orientation = urlencode($video['orientation']);

header("Location: https://kas-events.de/video_with_bg.php?file={$videoname}&orientation={$orientation}");
exit;
