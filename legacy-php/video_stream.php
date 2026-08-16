<?php
require '../../vendor/autoload.php';
use phpseclib3\Net\SFTP;

if (!isset($_GET['file'])) {
    die("Keine Datei angegeben.");
}

$file = $_GET['file'];

// SFTP Settings
$sftpHost = 'sftp.hidrive.strato.com';
$sftpPort = 22;
$sftpUser = 'koelnmarathon';
$sftpPass = 'Koelnmarathon2017!';
$sftpRemoteDir = '/public/uploads_secure/';


$sftp = new SFTP($sftpHost, $sftpPort);
if (!$sftp->login($sftpUser, $sftpPass)) {
    die("SFTP Login fehlgeschlagen!");
}

$remoteFile = $sftpRemoteDir . $file;

// Prüfen ob Datei existiert
if (!$sftp->file_exists($remoteFile)) {
    die("Datei nicht gefunden!");
}

// MIME-Type bestimmen anhand der Dateiendung
$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
$mimeTypes = [
    'mp4' => 'video/mp4',
    'mov' => 'video/quicktime',
    'avi' => 'video/x-msvideo',
    'mkv' => 'video/x-matroska'
];
$mime = $mimeTypes[$ext] ?? 'application/octet-stream';

// Header setzen
header('Content-Type: ' . $mime);
header('Content-Disposition: inline; filename="' . basename($file) . '"');

// Datei ausgeben
echo $sftp->get($remoteFile);
