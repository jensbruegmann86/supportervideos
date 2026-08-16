<?php
// DB-Verbindung
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";

// DB-Verbindung
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);



// === URL zur CSV-Datei (API-Endpoint) ===
$csvUrl = "https://api.raceresult.com/124686/K10IYEJXXJ60GFGQCPMTWP8UBGNEK28X";

// CSV abrufen
$csvContent = @file_get_contents($csvUrl);
if ($csvContent === false) {
    die("Fehler: Konnte CSV nicht laden.");
}

// CSV in Array wandeln
$rows = array_map("str_getcsv", explode("\n", trim($csvContent)));
$header = array_shift($rows);

// Index für "Startnr" finden
$startnrIndex = array_search("Startnr", $header);
if ($startnrIndex === false) {
    die("Fehler: Spalte 'Startnr' nicht gefunden.");
}

$found = false;

foreach ($rows as $row) {
    if (!isset($row[$startnrIndex]) || trim($row[$startnrIndex]) === "") {
        continue; // keine Startnummer
    }

    $startnr = trim($row[$startnrIndex]);

    // DB prüfen
    $stmt = $pdo->prepare("SELECT videoname, orientation 
                           FROM event_video 
                           WHERE approved = 1 AND bib = :bib 
                           ORDER BY video_count ASC LIMIT 1");
    $stmt->execute([":bib" => $startnr]);
    $video = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($video) {
        // detection setzen
        $update = $pdo->prepare("UPDATE event_video 
                                 SET detection = 1, detection_time = NOW() 
                                 WHERE bib = :bib");
        $update->execute([":bib" => $startnr]);

        // Redirect mit Videodaten
        $videoname = urlencode($video['videoname']);
        $orientation = urlencode($video['orientation']);

        header("Location: video_with_bg.php?file=$videoname&orientation=$orientation");
        exit;
    }
}

// Falls kein Eintrag -> Auto-Reload nach 1 Sekunde
?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="1">
    <title>Warte auf Startnummer</title>
</head>
<body>
    <p>Keine Startnummer mit gültigem DB-Eintrag gefunden.<br>
    Seite lädt automatisch neu...</p>
</body>
</html>