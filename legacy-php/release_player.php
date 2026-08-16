<?php
// DB-Verbindung
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";

// DB-Verbindung
$pdo = new PDO($dsn, $user, $pass);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$ids = explode(",", $_GET['ids'] ?? "");

// Player freigeben
$pdo->query("UPDATE player_state SET busy = 0 WHERE id=1");

if (!empty($ids)) {
    $in  = str_repeat('?,', count($ids) - 1) . '?';
    $stmt = $pdo->prepare("UPDATE event_video SET played = 1 WHERE id IN ($in)");
    $stmt->execute($ids);
}

echo "Player released";