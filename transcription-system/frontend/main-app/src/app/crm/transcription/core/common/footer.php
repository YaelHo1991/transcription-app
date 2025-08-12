        </main>
    </div>

    <!-- Page-specific JavaScript -->
    <?php if (isset($additionalJS)): ?>
        <?php foreach ($additionalJS as $jsFile): ?>
            <script src="<?php echo $jsFile; ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>

    <!-- Main JavaScript -->
    <script src="../assets/js/main.js"></script>
</body>
</html>