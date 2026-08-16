<?php
session_start();

// Prüfen ob bereits eingeloggt
if (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
    header("Location: dashboard.php");
    exit;
}

// Login-Check
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';

    // Passwort festlegen (z. B. "meinSicheresPasswort")
    $correctPassword = "abc1234567!";

    if ($password === $correctPassword) {
        $_SESSION['logged_in'] = true;
        header("Location: dashboard.php");
        exit;
    } else {
        $error = "Falsches Passwort!";
    }
}
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
    <link href="css/sign-in.css" rel="stylesheet">
  <meta name="theme-color" content="#712cf9">
</head>

<body class="d-flex align-items-center py-4 bg-body-tertiary">
<main class="form-signin w-100 m-auto">
    
    <form method="post">
        <h1 class="h3 mb-3 fw-normal">Videoupload</h1>
        <?php if (!empty($error)) echo "<p style='color:red;'>$error</p>"; ?>
        <div class="form-floating">
            <input type="password" name="password" class="form-control" id="floatingPassword" placeholder="Password" required>
            <label for="floatingPassword">Password</label>
        </div>
        <button class="btn btn-danger w-100 py-2" type="submit">Login</button>
    </form>
</main>
<script src="js/bootstrap.bundle.min.js" class="astro-vvvwv3sm"></script>  
</body> 
</html>