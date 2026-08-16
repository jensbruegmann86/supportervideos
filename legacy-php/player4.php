<?php
// === DB-Verbindung ===
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

// === 1. Poller: CSV abfragen und DB updaten (nur erste Startnr) ===
$csvUrl = "https://api.raceresult.com/124686/K10IYEJXXJ60GFGQCPMTWP8UBGNEK28X";
$csvContent = @file_get_contents($csvUrl);

if ($csvContent !== false) {
    $rows = array_map("str_getcsv", explode("\n", trim($csvContent)));
    $header = array_shift($rows);

    $startnrIndex = array_search("Startnr", $header);

    if ($startnrIndex !== false) {
        foreach ($rows as $row) {
            if (!isset($row[$startnrIndex]) || trim($row[$startnrIndex]) === "") {
                continue; // leere Zeilen überspringen
            }

            $bib = intval(trim($row[$startnrIndex]));

            // Nur erste gültige Zeile verarbeiten
            $stmt = $pdo->prepare("SELECT id FROM event_video 
                                   WHERE bib = ? AND approved = 1 AND ready = 0 AND played = 0");
            $stmt->execute([$bib]);
            $videosToUpdate = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($videosToUpdate as $v) {
                $update = $pdo->prepare("UPDATE event_video 
                                         SET detection = 1, detection_time = NOW(), ready = 1 
                                         WHERE id = ?");
                $update->execute([$v['id']]);
            }
            break; // <<< nur erste Startnummer aus CSV nehmen
        }
    }
}

// === 2. Player-Logik ===

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
    // Kein Video verfügbar → Auto-Reload
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

// Erstes Video auf „in Wiedergabe“ markieren + played_time setzen
$update = $pdo->prepare("UPDATE event_video SET played = 1, played_time = NOW() WHERE id = ?");
$update->execute([$video['id']]);

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
        background-color: black;
    }

    .container {
        position: relative;
        width: 1920px;
        height: 1080px;
    }

    video {
        position: absolute;
        object-fit: cover;
    }

    .portrait {
        width: 610px;
        height: 1080px;
        left: 50%;
        top: 0;
        transform: translateX(-50%);
    }

    .landscape {
        width: 1436px;
        height: 807px;
        left: 0;
        top: 0;
    }
</style>
</head>
<body>
<div class="container" id="videoContainer">
    <video id="myVideo" autoplay playsinline></video>
</div>

<script>
const playlist = <?= json_encode($videos) ?>;
let current = 0;
const vid = document.getElementById("myVideo");
const container = document.getElementById("videoContainer");

// Funktion zum Laden eines Videos mit passender Orientation
function loadVideo(index) {
    const item = playlist[index];
    if (!item) return;

    // Orientation-Klasse setzen
    vid.className = ""; // reset
    if (item.orientation === "portrait") {
        container.style.background = "url('backgrounds/bg_portrait.png') no-repeat center center";
        container.style.backgroundSize = "cover";
        vid.classList.add("portrait");
    } else {
        container.style.background = "url('backgrounds/bg_landscape.png') no-repeat center center";
        container.style.backgroundSize = "cover";
        vid.classList.add("landscape");
    }

    vid.src = "video_stream.php?file=" + encodeURIComponent(item.videoname);
    vid.play();

    // Backend updaten: played + played_time
    fetch("update_played.php?id=" + item.id);
}

// Erstes Video starten
loadVideo(current);

vid.addEventListener("ended", () => {
    current++;
    if (current < playlist.length) {
        loadVideo(current);
    } else {
        // Wenn alle Videos gespielt → Player wieder freigeben
        fetch("release_player.php?ids=" + playlist.map(v => v.id).join(","))
            .then(() => location.reload());
    }
});
</script>
</body>
</html>
