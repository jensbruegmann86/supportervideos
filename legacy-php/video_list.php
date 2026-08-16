<?php
// DB-Verbindung
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    die("DB-Verbindung fehlgeschlagen: " . $e->getMessage());
}

// Alle freigegebenen Videos abrufen
$stmt = $pdo->query("SELECT bib, video_count, videoname, orientation, remark FROM event_video WHERE approved = 1 AND trash = 0 ORDER BY bib, video_count ASC");
$videos = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Video-Übersicht</title>
<style>
    body { font-family: sans-serif; padding: 20px; background-color: #f0f0f0; }
    table { border-collapse: collapse; width: 100%; background: white; }
    th, td { padding: 10px; border: 1px solid #ccc; text-align: left; }
    th { background-color: #eee; }
    a.button {
        display: inline-block; padding: 6px 12px; background: #0073e6;
        color: white; text-decoration: none; border-radius: 4px;
    }
    a.button:hover { background: #005bb5; }
</style>
</head>
<body>
<h1>Übersicht aller Videos</h1>
<table>
    <thead>
        <tr>
            <th>BIB</th>
            <th>Video-Nummer</th>
            <th>Bemerkung</th>
            <th>Dateiname</th>
            <th>Orientierung</th>
            <th>Abspielen</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($videos as $v): ?>
        <tr>
            <td><?= htmlspecialchars($v['bib']) ?></td>
            <td><?= htmlspecialchars($v['video_count']) ?></td>
            <td><?= htmlspecialchars($v['remark']) ?></td>
            <td><?= htmlspecialchars($v['videoname']) ?></td>
            <td><?= $v['orientation'] == 1 ? 'portrait' : 'landscape' ?></td>
            <td>
                <a class="button" 
                   href="video_with_bg.php?file=<?= rawurlencode($v['videoname']) ?>&orientation=<?= $v['orientation']==1?'portrait':'landscape' ?>" 
                   target="_blank">Abspielen</a>
            </td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>
</body>
</html>
