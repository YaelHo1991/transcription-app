<?php
// Only allow in development mode
session_start();
if (!isset($_SESSION['is_admin']) && !isset($_GET['dev'])) {
    die('Unauthorized');
}

phpinfo();
?>