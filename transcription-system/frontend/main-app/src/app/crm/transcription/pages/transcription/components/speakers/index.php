<?php
/**
 * Speaker Component Index
 * Main entry point for the speaker section
 */
?>

<!-- Speaker Component CSS -->
<link rel="stylesheet" href="<?php echo $GLOBALS['CLIENT_BASE_URL']; ?>/src/transcription/pages/transcription/components/speakers/css/speakers-main.css?v=<?php echo time(); ?>">
<link rel="stylesheet" href="<?php echo $GLOBALS['CLIENT_BASE_URL']; ?>/src/transcription/pages/transcription/components/speakers/toolbar/speakers-toolbar.css?v=<?php echo time(); ?>">

<!-- Speaker Component HTML -->
<?php include __DIR__ . '/html/speakers-panel.php'; ?>

<!-- Speaker Component JavaScript -->
<script src="<?php echo $GLOBALS['CLIENT_BASE_URL']; ?>/src/transcription/pages/transcription/components/speakers/js/speakers-manager.js?v=<?php echo time(); ?>"></script>
<script src="<?php echo $GLOBALS['CLIENT_BASE_URL']; ?>/src/transcription/pages/transcription/components/speakers/js/speakers-blocks.js?v=<?php echo time(); ?>"></script>
<script src="<?php echo $GLOBALS['CLIENT_BASE_URL']; ?>/src/transcription/pages/transcription/components/speakers/js/speakers-ui.js?v=<?php echo time(); ?>"></script>
<script src="<?php echo $GLOBALS['CLIENT_BASE_URL']; ?>/src/transcription/pages/transcription/components/speakers/js/speakers-init.js?v=<?php echo time(); ?>"></script>