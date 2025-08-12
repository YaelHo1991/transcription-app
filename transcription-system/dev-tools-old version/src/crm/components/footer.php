        </div> <!-- End main-content -->
    </div> <!-- End container -->
    
    <!-- Scripts -->
    <script src="../assets/js/crm.js"></script>
    <?php if (isset($additionalScripts)): ?>
        <?php foreach ($additionalScripts as $script): ?>
            <script src="<?php echo $script; ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>
</body>
</html>