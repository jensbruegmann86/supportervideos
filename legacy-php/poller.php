<?php
// poller.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// DB-Verbindung
$dsn = "mysql:host=localhost;dbname=web109_db10;charset=utf8mb4";
$user = "web109_10";
$pass = "dbMsvdu209!";

// DB-Verbindung
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);


// URL zur CSV
$csvUrl = "https://api.raceresult.com/124686/K10IYEJXXJ60GFGQCPMTWP8UBGNEK28X";


// Endlosschleife
while (true) {
    $csvContent = @file_get_contents($csvUrl);
    if ($csvContent !== false) {
        $rows = array_map("str_getcsv", explode("\n", trim($csvContent)));
        $header = array_shift($rows);

        $startnrIndex = array_search("Startnr", $header);
        if ($startnrIndex !== false) {
            foreach ($rows as $row) {
                if (!isset($row[$startnrIndex]) || trim($row[$startnrIndex]) === "") {
                    continue;
                }

                $bib = intval(trim($row[$startnrIndex]));

                // Videos suchen
                $stmt = $pdo->prepare("SELECT id FROM event_video WHERE bib = ? AND approved = 1 AND ready = 0 AND played = 0");
                $stmt->execute([$bib]);
                $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if ($videos) {
                    foreach ($videos as $v) {
                        $update = $pdo->prepare("UPDATE event_video 
                            SET detection = 1, detection_time = NOW(), ready = 1 
                            WHERE id = ?");
                        $update->execute([$v['id']]);
                    }
                    echo date("H:i:s")." – Videos für BIB $bib freigegeben.\n";
                }
            }
        }
    } else {
        echo date("H:i:s")." – Fehler: CSV nicht geladen.\n";
    }

    // 1 Sekunde warten
    sleep(1);
}
