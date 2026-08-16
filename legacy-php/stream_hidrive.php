<?php
// === Eingabe prüfen ===
if (!isset($_GET['file']) || empty($_GET['file'])) {
    http_response_code(400);
    die("Fehler: Keine Datei angegeben.");
}

$videoFile = basename($_GET['file']); // Sicherheit: nur Dateiname

// HiDrive Zugangsdaten
$webdavUser = "koelnmarathon";       // dein HiDrive-User
$webdavPass = "Koelnmarathon2017!";  // dein Passwort
$webdavBase = "https://webdav.hidrive.strato.com/public/uploads_secure/";

// Vollständige WebDAV-URL
$remoteUrl = $webdavBase . rawurlencode($videoFile);

// MIME-Type anhand Dateiendung bestimmen
function getMimeType($filename) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    switch ($ext) {
        case 'mp4': return 'video/mp4';
        case 'mov': return 'video/quicktime';
        case 'avi': return 'video/x-msvideo';
        case 'mkv': return 'video/x-matroska';
        default: return 'application/octet-stream';
    }
}
$mimeType = getMimeType($videoFile);

// Mit cURL an HiDrive weiterleiten
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $remoteUrl);
curl_setopt($ch, CURLOPT_USERPWD, "$webdavUser:$webdavPass");
curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false); // direkt ausgeben
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HEADER, false);

// Range-Header für Video-Streaming (sehr wichtig!)
if (isset($_SERVER['HTTP_RANGE'])) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Range: " . $_SERVER['HTTP_RANGE']]);
}

// Header setzen
header("Content-Type: $mimeType");
header("Cache-Control: no-cache");

// Ausführen
curl_exec($ch);

// Fehler prüfen
if (curl_errno($ch)) {
    http_response_code(500);
    echo "Fehler beim Streamen: " . curl_error($ch);
}

curl_close($ch);
