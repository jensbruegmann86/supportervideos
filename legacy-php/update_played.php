<?php
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";
$pdo = new PDO($dsn, $user, $pass);

if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    $stmt = $pdo->prepare("UPDATE event_video SET played = 1, played_time = NOW() WHERE id = ?");
    $stmt->execute([$id]);
    echo "ok";
}
