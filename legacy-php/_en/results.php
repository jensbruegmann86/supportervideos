<?php
// DB-Verbindung
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    die("DB-Connection failed: " . $e->getMessage());
}

// Eingabe holen
$q = isset($_GET['q']) ? trim($_GET['q']) : '';

if ($q === '') {
    die("Please enter a search.");
}

// Suche vorbereiten (LIKE mit Wildcards)
$sql = "SELECT bib, name, surname, race
        FROM event_participants
        WHERE bib LIKE :q
           OR name LIKE :q
           OR surname LIKE :q
           OR CONCAT(name, ' ', surname) LIKE :q
           OR CONCAT(surname, ' ', name) LIKE :q
        ORDER BY surname ASC, name ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute([":q" => "%$q%"]);
$results = $stmt->fetchAll();
// Anzahl der gefundenen Einträge
$resultCount = count($results);

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
            <div class="card text-bg-light mb-3 text-center">
              <div class="card-body">
                <form action="results.php" method="get">

                <div class="row g-3">
                  <div class="col-sm-7">
                    <input type="text" name="q" class="form-control" style="font-size: 1.25rem;" placeholder="Bib or name" aria-label="Search" required="">
                  </div>
                  <div class="col-sm">
                    <div class="d-grid">
                      <button class="btn btn-primary btn-gkm" type="submit"><strong>Search</strong></button>
                    </div>
                  </div>
                </div>

                </form>

              </div>
            </div>
        </div>
      </div>
      <div class="row">
        <div class="col pb-2">
            <strong><?php echo $resultCount; ?> Results</strong>
        </div>
      </div>
<?php if (empty($results)): ?>
    <p>No participant found.</p>
    <?php else: ?>
        <?php foreach ($results as $row): ?>
      <div class="row justify-content-center">
        <div class="col-md-10 col-lg-8">
          <div class="d-grid gap-2">
          <a href="upload.php?key=ASDRFTRA&bib=<?= htmlspecialchars($row['bib']) ?>&sdf=asdrRF" class="btn btn-lg btn-light border border-gkm" style="text-align: left; position: relative; margin-bottom: 15px;">
            <span style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%);" class="bi bi-arrow-right-circle-fill text-gkm">&nbsp;</span>
            <span class="text-gkm"><strong><?= htmlspecialchars($row["name"]) ?> <?= htmlspecialchars($row["surname"]) ?></strong></span><br><span class="text-gkm-sm"><?= htmlspecialchars($row["bib"]) ?> | <?php if ($row["race"]==1) { echo "Marathon"; } elseif ($row["race"]==2) { echo "Halfmarathon"; } ?></span>
          </a>
          </div>
        </div>
      </div>
        <?php endforeach; ?>
    <?php endif; ?>

      </div>
    </div>   
<script src="js/bootstrap.bundle.min.js" class="astro-vvvwv3sm"></script>
</body>
</html>