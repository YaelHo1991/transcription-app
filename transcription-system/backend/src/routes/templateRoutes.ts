import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Serve the Hebrew export template
router.get('/export-template', (req, res) => {
  const templatePath = path.join(__dirname, '../../templates/hebrew-export-template.docx');
  
  if (fs.existsSync(templatePath)) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'inline; filename="hebrew-export-template.docx"');
    res.sendFile(templatePath);
  } else {
    res.status(404).json({ error: 'Template file not found' });
  }
});

export default router;