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

// DB-Verbindung
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

// SFTP Settings

$sftpHost = 'sftp.hidrive.strato.com';
$sftpPort = 22;
$sftpUser = 'koelnmarathon';
$sftpPass = 'Koelnmarathon2017!';
$sftpRemoteDir = '/public/uploads_secure/';

// SFTP-Verbindung aufbauen
$sftp = new SFTP($sftpHost, $sftpPort);
if (!$sftp->login($sftpUser, $sftpPass)) {
    die("SFTP Login fehlgeschlagen!");
}


// Aktion verarbeiten
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'], $_POST['id'])) {
    $id = (int)$_POST['id'];
    $remark = isset($_POST['remark']) ? trim($_POST['remark']) : null;

    $stmt = $pdo->prepare("SELECT bib, video_count FROM event_video WHERE id = ?");
    $stmt->execute([$id]);
    $video = $stmt->fetch();

    if ($video) {
        $bib = $video['bib'];
        $count = $video['video_count'];
        $pattern = $bib . '-' . $count . '.*';

        // Dateien auf HiDrive durchsuchen
        $files = $sftp->nlist($sftpRemoteDir);
        $remoteFile = null;
        foreach ($files as $f) {
            if (fnmatch($pattern, $f)) {
                $remoteFile = $f;
                break;
            }
        }

        if ($_POST['action'] === 'accept') {
            // DB-Eintrag freigeben + Bemerkung speichern
            $stmt = $pdo->prepare("UPDATE event_video SET approved = 1, remark = ? WHERE id = ?");
            $stmt->execute([$remark, $id]);
        } elseif ($_POST['action'] === 'delete') {
            // Datei löschen
            if ($remoteFile) $sftp->delete($sftpRemoteDir . $remoteFile);
            // DB-Eintrag auf "Papierkorb" setzen + Bemerkung speichern
            $stmt = $pdo->prepare("UPDATE event_video SET approved = 1, trash = 1, remark = ? WHERE id = ?");
            $stmt->execute([$remark, $id]);
        }
    }

    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}

// --- Erste offene BIB holen ---
$stmt = $pdo->query("
    SELECT bib 
    FROM event_video 
    WHERE approved = 0 AND trash = 0 
    ORDER BY bib ASC, upload_time ASC 
    LIMIT 1
");
$bibRow = $stmt->fetch(PDO::FETCH_ASSOC);

$videos = [];
if ($bibRow) {
    $bib = $bibRow['bib'];
    $stmt = $pdo->prepare("SELECT * FROM event_video WHERE bib = ? AND approved = 0 AND trash = 0 ORDER BY upload_time ASC");
    $stmt->execute([$bib]);
    $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Anzahl aller Videos (nur Info)
$stmtCount = $pdo->query("SELECT COUNT(*) AS total FROM event_video WHERE trash = 0");
$totalVideos = $stmtCount->fetch()['total'];
?>

<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Video Management</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="p-3">
<h2>Video Management Dashboard</h2>
<p><a href="video_list.php">Video-Liste</a></p>
<p><a href="reset_videos.php">Video-reset</a></p>
<p><strong>Bereits hochgeladene Videos:</strong> <?= $totalVideos ?></p>

<?php if ($videos): ?>
    <h4>BIB <?= htmlspecialchars($bib) ?> (<?= count($videos) ?> offene Videos)</h4>

    <?php foreach ($videos as $video): 
        $count = $video['video_count'];
        $pattern = $bib . '-' . $count . '.*';

        // Remote-Datei suchen (SFTP anpassen!)
        $files = $sftp->nlist($sftpRemoteDir);
        $remoteFile = null;
        foreach ($files as $f) {
            if (fnmatch($pattern, $f)) {
                $remoteFile = $f;
                break;
            }
        }
    ?>
    <div class="card mb-3">
        <div class="card-body">
            <h5 class="card-title">
                Video #: <?= $count ?> | Freigabe: <?= $video['approved'] ? 'Ja' : 'Nein' ?>
            </h5>
            <?php if ($remoteFile): ?>
                <video width="320" height="568" controls>
                    <source src="video_stream.php?file=<?= urlencode($remoteFile) ?>" type="video/mp4">
                    Dein Browser unterstützt das Video-Tag nicht.
                </video>
            <?php else: ?>
                <p class="text-danger">Video nicht gefunden!</p>
            <?php endif; ?>

            <form method="post" class="mt-2">
                <input type="hidden" name="id" value="<?= $video['id'] ?>">
                <div class="mb-2">
                    <label for="remark-<?= $video['id'] ?>" class="form-label">Bemerkung</label>
                    <textarea name="remark" id="remark-<?= $video['id'] ?>" class="form-control" rows="2"><?= htmlspecialchars($video['remark'] ?? '') ?></textarea>
                </div>
                <button type="submit" name="action" value="accept" class="btn btn-success">Freigeben</button>
                <button type="submit" name="action" value="delete" class="btn btn-danger" onclick="return confirm('Video wirklich löschen?')">Löschen</button>
            </form>
        </div>
    </div>
    <?php endforeach; ?>

<?php else: ?>
    <p class="text-success">Keine offenen Videos zur Prüfung 🎉</p>
<?php endif; ?>

</body>
</html>