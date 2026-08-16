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

// CSV von URL laden
$csvUrl = "https://api.raceresult.com/300956/76RPSFGMPMH4IONMJ7M6WWXWYRI71A6G";
$handle = fopen($csvUrl, "r");
if (!$handle) {
    die("Could not load participants.");
}

// Erste Zeile (Header) lesen
$header = fgetcsv($handle, 1000, ";");

// Batch vorbereiten
$rows = [];
$batchSize = 500; // Anzahl Datensätze pro Insert (anpassbar)

// CSV einlesen
while (($row = fgetcsv($handle, 1000, ";")) !== false) {
    $data = array_combine($header, $row);

    $rows[] = [
        "bib"     => $data["Startnr"],
        "name"    => $data["Vorname"],
        "surname" => $data["Nachname"],
        "race"    => $data["Wettbewerb"]
    ];

    // Wenn Batch voll → in DB schreiben
    if (count($rows) >= $batchSize) {
        insertBatch($pdo, $rows);
        $rows = [];
    }
}
fclose($handle);

// Restliche Daten einfügen
if (!empty($rows)) {
    insertBatch($pdo, $rows);
}

/**
 * Batch-Insert mit ON DUPLICATE KEY UPDATE
 */
function insertBatch(PDO $pdo, array $rows) {
    $values = [];
    $params = [];

    foreach ($rows as $i => $row) {
        $values[] = "(?, ?, ?, ?)";
        $params[] = $row["bib"];
        $params[] = $row["name"];
        $params[] = $row["surname"];
        $params[] = $row["race"];
    }

    $sql = "INSERT INTO event_participants (bib, name, surname, race) VALUES "
         . implode(", ", $values)
         . " ON DUPLICATE KEY UPDATE 
              name=VALUES(name),
              surname=VALUES(surname),
              race=VALUES(race)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
}

?>
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
    </div>   
<script src="js/bootstrap.bundle.min.js" class="astro-vvvwv3sm"></script>
</body>
</html>