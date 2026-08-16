<?php
session_start();

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$uploadDir = dirname(__DIR__) . "/uploads_secure/";

function getMimeType($filename) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return match($ext) {
        'mp4' => 'video/mp4',
        'mov' => 'video/quicktime',
        'avi' => 'video/x-msvideo',
        'mkv' => 'video/x-matroska',
        default => 'application/octet-stream',
    };
}

$file = $_GET['file'] ?? '';

if ($file === '') {
    $files = glob($uploadDir . "*.{mp4,MP4,mov,MOV,avi,AVI,mkv,MKV}", GLOB_BRACE);

    echo "<!DOCTYPE html><html lang='de'><head><meta charset='UTF-8'><title>Gesicherte Videos</title></head><body>";
    echo "<h2>Gesicherte Videos</h2>";
    echo "<a href='logout.php'>Logout</a><hr>";

    foreach ($files as $f) {
        $basename = basename($f);
        $mime = getMimeType($basename);

        echo "<h3>$basename</h3>";
        echo "<video width='480' controls>";
        echo "<source src='download.php?file=" . urlencode($basename) . "' type='" . $mime . "'>";
        echo "Dein Browser unterstützt kein Video-Tag.";
        echo "</video><br><br>";
    }

    echo "</body></html>";
    exit;
}

// Sicherheitscheck
$filename = basename($file);
$filepath = $uploadDir . $filename;

if (!file_exists($filepath)) {
    http_response_code(404);
    exit("Datei nicht gefunden.");
}

$mime = getMimeType($filename);
header("Content-Type: $mime");
header("Content-Length: " . filesize($filepath));
header("Accept-Ranges: bytes");

readfile($filepath);
exit;
