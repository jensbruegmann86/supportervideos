<?php
error_reporting(E_ALL);
ini_set("display_errors", 1);


session_start();

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

require '../../vendor/autoload.php';
use phpseclib3\Net\SFTP;


// === DB-Verbindung ===
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

$message = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Alle Felder zurücksetzen
    $sql = "UPDATE event_video 
            SET played_time = NULL,
                played = 0,
                detection_time = NULL,
                detection = 0,
                ready = 0";
    $pdo->exec($sql);

    $message = "Alle Videos wurden zurückgesetzt!";
}
?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Event Video Reset</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #222;
            color: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .box {
            background: #333;
            padding: 20px 30px;
            border-radius: 8px;
            text-align: center;
        }
        button {
            padding: 12px 20px;
            font-size: 16px;
            font-weight: bold;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            background: #e63946;
            color: white;
        }
        button:hover {
            background: #d62828;
        }
        .msg {
            margin-top: 15px;
            color: #4cc9f0;
        }
    </style>
</head>
<body>
    <div class="box">
        <h2>Event-Video zurücksetzen</h2>
        <form method="post">
            <button type="submit">Alle Felder zurücksetzen</button>
        </form>
        <?php if ($message): ?>
            <p class="msg"><?= htmlspecialchars($message) ?></p>
        <?php endif; ?>
    </div>
</body>
</html>
