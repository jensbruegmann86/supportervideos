<?php
// SFTP Verbindung (phpseclib v3)
require '../../../vendor/autoload.php';
use phpseclib3\Net\SFTP;

$showupload = 1;

if(isset($_GET['bib'])) {
    $bib = $_GET['bib'];
    }

if(isset($_POST['bib'])) {
    $bib = $_POST['bib'];
  }

// DB-Verbindung
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";

// DB-Verbindung
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

// BEGIN Settings Change
if (isset($_POST['save'])) {
    $save = $_POST['save'];

    if ($save == 'new_video') {
        // Max. Dateigröße in Bytes (20 MB)
        $maxFileSize = 30 * 1024 * 1024;

        // Erlaubte MIME-Typen
        $allowedTypes = [
            'video/mp4',
            'video/quicktime',   // mov
            'video/x-msvideo',   // avi
            'video/x-matroska'   // mkv
        ];

        $errors = []; // Array für Fehlermeldungen

        // Datei prüfen
        if (!isset($_FILES['video'])) {
            $errors[] = "No upload.";
        } else {
            $file = $_FILES['video'];

            if ($file['error'] !== UPLOAD_ERR_OK) {
                $errors[] = "Upload-error (Code: {$file['error']})";
            }

            if ($file['size'] > $maxFileSize) {
                $errors[] = "Filesize bigger than 20 MB.";
            }

            // MIME-Type prüfen
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            if (!in_array($mime, $allowedTypes)) {
                $errors[] = "Only Videos allowed (mp4, mov, avi, mkv).";
            }

        }

        // Wenn keine Fehler, Datei per SFTP hochladen
        if (empty($errors)) {
            $bib = $_POST['bib'];

            // nächsten video_count bestimmen
            $stmt = $pdo->prepare("SELECT MAX(video_count) FROM event_video WHERE bib = ?");
            $stmt->execute([$bib]);
            $video_count = (int)$stmt->fetchColumn() + 1;

            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $newName = $bib . "-" . $video_count . "." . $ext;

            $sftpHost = 'sftp.hidrive.strato.com';
            $sftpPort = 22;
            $sftpUser = 'koelnmarathon';
            $sftpPass = 'Koelnmarathon2017!';
            $sftpRemoteDir = '/public/uploads_secure/';

            $sftp = new SFTP($sftpHost, $sftpPort);
            if (!$sftp->login($sftpUser, $sftpPass)) {
                $errors[] = "SFTP Login error.";
            } else {
                if (!$sftp->chdir($sftpRemoteDir)) {
                    $errors[] = "Remote-error.";
                } else {
                    if (!$sftp->put($newName, $file['tmp_name'], SFTP::SOURCE_LOCAL_FILE)) {
                        $errors[] = "Upload error.";
                    }
                }
            }

// Wenn Upload erfolgreich, in DB eintragen
            if (empty($errors)) {
                
                // Orientierung mit ffprobe ermitteln
                $cmd = "ffprobe -v error -select_streams v:0 -show_entries stream=width,height "
                     . "-of csv=p=0:s=x " . escapeshellarg($file['tmp_name']);
                $output = shell_exec($cmd);

                $orientation = 2; // Default: Landscape

                if ($output) {
                    $dims = explode("x", trim($output));
                    if (count($dims) === 2) {
                        $videoWidth  = (int)$dims[0];
                        $videoHeight = (int)$dims[1];

                        if ($videoHeight > $videoWidth) {
                            $orientation = 1; // Portrait
                        }
                    }
                }

                // Rotation-Tag abfragen (z. B. bei Smartphone-Aufnahmen)
                $cmd = "ffprobe -v error -select_streams v:0 -show_entries stream_tags=rotate "
                     . "-of default=noprint_wrappers=1:nokey=1 " . escapeshellarg($file['tmp_name']);
                $rotation = trim(shell_exec($cmd));

                if ($rotation === "90" || $rotation === "270") {
                    $orientation = 1; // Portrait durch Drehung
                }


                // DB-Eintrag inkl. orientation + videoname
                $stmt = $pdo->prepare("INSERT INTO event_video (bib, video_count, orientation, videoname) VALUES (?, ?, ?, ?)");
                $stmt->execute([$bib, $video_count, $orientation, $newName]);

                $success = "Your video has been uploaded!";
                $showupload = 0;
            }
        }
    }
}
// END Settings Change


?>

<!DOCTYPE html>
<html lang="en" data-bs-theme="auto">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="">
  <meta name="author" content="Jens Brügmann">
  <title>Generali Köln Marathon - VideoSupporter</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-LN+7fdVzj6u52u30Kp6M/trliBMCMKTyK833zpbD+pXdCLuTusPj697FH4R/5mcr" crossorigin="anonymous">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
  <meta name="theme-color" content="#712cf9">
    <link href="css/sign-in.css" rel="stylesheet">
</head>


<body>
    <div class="container text-center">
      <div class="row justify-content-center">
        <div class="col-md-10 col-lg-8">
          <p><a href="index.php">New search</a></p>
        </div>
      </div>

<?php
if($showupload==1) {


try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    die("DB-connection failed: " . $e->getMessage());
}

if (!$bib) {
    die("No ID.");
}

// Abfrage vorbereiten
$sql = "SELECT name, surname, race 
        FROM event_participants 
        WHERE bib = :bib
        LIMIT 1";

$stmt = $pdo->prepare($sql);
$stmt->execute([":bib" => $bib]);

$row = $stmt->fetch();

?>

      <div class="row justify-content-center">
        <div class="col-md-10 col-lg-8">
          <div class="d-grid gap-2">
          <a href="upload.php?key=ASDRFTRA&bib=<?php echo $bib; ?>&sdf=asdrRF" class="btn btn-lg btn-light border border-gkm" style="text-align: left; position: relative; margin-bottom: 15px;">
            <span style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%);" class="bi bi-check-circle-fill text-gkm">&nbsp;</span>
            <span class="text-gkm"><strong><?= htmlspecialchars($row["name"]) ?> <?= htmlspecialchars($row["surname"]) ?></strong></span><br><span class="text-gkm-sm"><?= htmlspecialchars($bib) ?> | <?php if ($row["race"]==1) { echo "Marathon"; } elseif ($row["race"]==2) { echo "Halfmarathon"; } ?></span>
          </a>
          </div>
        </div>
      </div>
<?php if (!empty($errors)): ?>
    <div style="color:red;">
        <?php foreach ($errors as $err) echo "<p>$err</p>"; ?>
    </div>
<?php endif; ?>
      <div class="row justify-content-center mt-3">
        <div class="col-md-10 col-lg-8">
          <div class="d-grid gap-2">
            <p><strong>Video upload (max. 6s / 30 MB)</strong></p>
            <form action="" method="post" enctype="multipart/form-data">
              <input type="hidden" name="bib" value="<?php echo $bib; ?>">
              <input type="hidden" name="save" value="new_video">

              <div class="row g-3 mb-2">
                <div class="col">
                  <input class="form-control" type="file" name="video" accept="video/*" style="font-size: 1.25rem;" required>
                </div>
              </div>
              <div class="row g-3 mb-2">
                <div class="col">
                  <div class="d-grid">
                    <p>&nbsp;</p>
                  </div>
                </div>
              </div>
              <div class="row g-3 mb-2">
                <div class="col">
                  <label>
                    <input type="checkbox" id="agreement" required>
                    I agree to the terms below.
                  </label>
                </div>
              </div>
              <div class="row g-3 mb-2">
                <div class="col">
                  <div class="d-grid">
                    <button class="btn btn-primary btn-gkm" type="submit"><strong><i class="bi bi-cloud-arrow-up-fill"></i> Upload</strong></button>
                  </div>
                </div>
              </div>
              <div class="row g-3 mb-2">
                <div class="col">
                  <div class="d-grid">
                    <p>&nbsp;</p>
                  </div>
                </div>
              </div>
              <div class="row g-3 mb-2">
                <div class="col">
                  <div class="d-grid">
                      <?php include 'terms.php'; ?>
                  </div>
                </div>
              </div>

            </form>
          </div>
        </div>
      </div>


<?php
   } else {

    if (!empty($success)): ?>
    <div style="color:green;">
        <p><?= $success ?></p>
    </div>

<?php
    endif;
   }
?>



        </div>
      </div>
    </div>   
<script src="js/bootstrap.bundle.min.js" class="astro-vvvwv3sm"></script>
<script>
function checkAgreement() {
  if (!document.getElementById("agreement").checked) {
    alert("Please agree to the terms for videocontenct-upload.");
    return false;
  }
  return true;
}
</script>

</body>
</html>