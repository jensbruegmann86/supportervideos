<?php
// DB-Verbindung
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";

// DB-Verbindung
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);


$bib = intval($_GET['bib'] ?? 0);
if (!$bib) die("Keine Startnummer erhalten");

// Prüfen, ob Player frei ist
$state = $pdo->query("SELECT busy FROM player_state WHERE id=1")->fetch(PDO::FETCH_ASSOC);

// Videos zur BIB holen
$stmt = $pdo->prepare("SELECT id FROM event_video WHERE bib = ? AND approved = 1");
$stmt->execute([$bib]);
$videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

if ($state['busy'] == 1) {
    // Player ist beschäftigt → Videos markieren, aber nicht freigeben
    foreach ($videos as $v) {
        $update = $pdo->prepare("UPDATE event_video 
            SET detection = 1, detection_time = NOW(), played = 2 
            WHERE id = ?");
        $update->execute([$v['id']]);
    }
    echo "Player busy – Detektion gespeichert, Videos NICHT freigegeben.";
    exit;
}

// Player frei → Videos für Abspielen freigeben
if ($videos) {
    foreach ($videos as $v) {
        $update = $pdo->prepare("UPDATE event_video 
            SET detection = 1, detection_time = NOW(), ready = 1 
            WHERE id = ?");
        $update->execute([$v['id']]);
    }
    echo "Videos für Startnr $bib aktiviert.";
} else {
    echo "Keine Videos für Startnr $bib gefunden.";
}
?>