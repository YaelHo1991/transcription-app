// word-hebrew-converter.js
// ממיר מסמכי Word לעברית עם עיצוב אוטומטי לדיאלוגים

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

class WordHebrewConverter {
    constructor() {
        this.inputFile = null;
        this.outputFile = null;
        this.shouldApplyDialogueFormatting = true; // ברירת מחדל - להחיל עיצוב דיאלוג
    }

    // המרת קובץ בודד
    async convertFile(inputPath, outputPath = null, options = {}) {
        try {
            console.log('📄 קורא את הקובץ:', inputPath);
            
            // אופציות
            this.shouldApplyDialogueFormatting = options.dialogue !== false;
            
            // בדיקה שהקובץ קיים
            if (!fs.existsSync(inputPath)) {
                throw new Error('הקובץ לא נמצא');
            }

            // יצירת שם קובץ פלט אם לא סופק
            if (!outputPath) {
                const dir = path.dirname(inputPath);
                const filename = path.basename(inputPath, '.docx');
                outputPath = path.join(dir, `${filename}_hebrew.docx`);
            }

            // קריאת הקובץ
            const content = fs.readFileSync(inputPath);
            const zip = new PizZip(content);

            console.log('🔄 ממיר את השפה לעברית...');
            if (this.shouldApplyDialogueFormatting) {
                console.log('🎨 מוסיף עיצוב דיאלוג...');
            }

            // עיבוד document.xml
            if (zip.file('word/document.xml')) {
                const documentXml = zip.file('word/document.xml').asText();
                const updatedDocument = this.convertXmlToHebrew(documentXml, 'document');
                zip.file('word/document.xml', updatedDocument);
            }

            // עיבוד styles.xml
            if (zip.file('word/styles.xml')) {
                const stylesXml = zip.file('word/styles.xml').asText();
                const updatedStyles = this.convertXmlToHebrew(stylesXml, 'styles');
                zip.file('word/styles.xml', updatedStyles);
            } else if (this.shouldApplyDialogueFormatting) {
                // יצירת קובץ סגנונות אם לא קיים
                const newStyles = this.createStylesWithDialogue();
                zip.file('word/styles.xml', newStyles);
            }

            // עיבוד numbering.xml (רשימות ממוספרות)
            if (zip.file('word/numbering.xml')) {
                const numberingXml = zip.file('word/numbering.xml').asText();
                const updatedNumbering = this.convertXmlToHebrew(numberingXml, 'numbering');
                zip.file('word/numbering.xml', updatedNumbering);
            }

            // עיבוד settings.xml
            if (zip.file('word/settings.xml')) {
                const settingsXml = zip.file('word/settings.xml').asText();
                const updatedSettings = this.updateDocumentSettings(settingsXml);
                zip.file('word/settings.xml', updatedSettings);
            }

            // עיבוד headers
            const headerFiles = Object.keys(zip.files).filter(name => name.startsWith('word/header'));
            for (const headerFile of headerFiles) {
                const headerXml = zip.file(headerFile).asText();
                const updatedHeader = this.convertXmlToHebrew(headerXml, 'header');
                zip.file(headerFile, updatedHeader);
            }

            // עיבוד footers
            const footerFiles = Object.keys(zip.files).filter(name => name.startsWith('word/footer'));
            for (const footerFile of footerFiles) {
                const footerXml = zip.file(footerFile).asText();
                const updatedFooter = this.convertXmlToHebrew(footerXml, 'footer');
                zip.file(footerFile, updatedFooter);
            }

            // שמירת הקובץ החדש
            const outputContent = zip.generate({ 
                type: 'nodebuffer',
                compression: 'DEFLATE'
            });

            fs.writeFileSync(outputPath, outputContent);
            
            console.log('✅ ההמרה הושלמה בהצלחה!');
            console.log('📁 הקובץ נשמר ב:', outputPath);
            
            if (this.shouldApplyDialogueFormatting) {
                console.log('💡 טיפ: פסקאות דיאלוג עוצבו אוטומטית עם הזחה תלויה');
            }
            
            return outputPath;

        } catch (error) {
            console.error('❌ שגיאה:', error.message);
            throw error;
        }
    }

    // המרת XML לעברית עם עיצוב דיאלוג
    convertXmlToHebrew(xmlContent, type = 'document') {
        const parser = new DOMParser();
        const serializer = new XMLSerializer();
        const doc = parser.parseFromString(xmlContent, 'text/xml');

        // עדכון כל תגי השפה
        const langElements = doc.getElementsByTagName('w:lang');
        for (let i = 0; i < langElements.length; i++) {
            const elem = langElements[i];
            // שינוי כל המאפיינים לעברית
            if (elem.getAttribute('w:val')) {
                elem.setAttribute('w:val', 'he-IL');
            }
            if (elem.getAttribute('w:eastAsia')) {
                elem.setAttribute('w:eastAsia', 'he-IL');
            }
            if (elem.getAttribute('w:bidi')) {
                elem.setAttribute('w:bidi', 'he-IL');
            }
        }

        // הוספת תמיכה ב-RTL לפסקאות
        const paragraphProps = doc.getElementsByTagName('w:pPr');
        for (let i = 0; i < paragraphProps.length; i++) {
            const pPr = paragraphProps[i];
            
            // בדיקה אם כבר יש תג bidi
            const existingBidi = this.getChildByTagName(pPr, 'w:bidi');
            if (!existingBidi) {
                const bidi = doc.createElement('w:bidi');
                pPr.appendChild(bidi);
            }

            // אם זה document.xml ועיצוב דיאלוג מופעל
            if (type === 'document' && this.shouldApplyDialogueFormatting) {
                // בדיקה אם זו פסקת דיאלוג (מכילה : או טאב בהתחלה)
                const paragraph = pPr.parentNode;
                if (this.isDialogueParagraph(paragraph)) {
                    this.applyDialogueFormatting(doc, pPr);
                }
            }
        }

        // הוספת הגדרות שפה לרצות טקסט (runs)
        const runProps = doc.getElementsByTagName('w:rPr');
        for (let i = 0; i < runProps.length; i++) {
            const rPr = runProps[i];
            // בדיקה אם כבר יש תג lang
            const existingLang = this.getChildByTagName(rPr, 'w:lang');
            if (!existingLang) {
                const lang = doc.createElement('w:lang');
                lang.setAttribute('w:val', 'he-IL');
                lang.setAttribute('w:bidi', 'he-IL');
                rPr.appendChild(lang);
            }
        }

        // טיפול בטבלאות - הוספת כיווניות RTL
        if (type === 'document') {
            const tablePrs = doc.getElementsByTagName('w:tblPr');
            for (let i = 0; i < tablePrs.length; i++) {
                const tblPr = tablePrs[i];
                const existingBidi = this.getChildByTagName(tblPr, 'w:bidiVisual');
                if (!existingBidi) {
                    const bidiVisual = doc.createElement('w:bidiVisual');
                    tblPr.appendChild(bidiVisual);
                }
            }
        }

        return serializer.serializeToString(doc);
    }

    // בדיקה אם זו פסקת דיאלוג
    isDialogueParagraph(paragraph) {
        // חיפוש הטקסט בפסקה
        const textElements = paragraph.getElementsByTagName('w:t');
        let fullText = '';
        for (let i = 0; i < textElements.length; i++) {
            fullText += textElements[i].textContent || '';
        }

        // בדיקה אם יש : או טאב בהתחלה (סימן לדיאלוג)
        // או אם יש מבנה של "שם: טקסט" או "שם[טאב]טקסט"
        const dialoguePattern = /^[^:]+:\s*|^\S+\t/;
        return dialoguePattern.test(fullText.trim());
    }

    // החלת עיצוב דיאלוג על פסקה
    applyDialogueFormatting(doc, pPr) {
        // הוספת הזחה תלויה (Hanging Indent)
        let ind = this.getChildByTagName(pPr, 'w:ind');
        if (!ind) {
            ind = doc.createElement('w:ind');
            pPr.appendChild(ind);
        }
        
        // הגדרת הזחה תלויה של 2 ס"מ (1134 twips)
        ind.setAttribute('w:left', '1134');
        ind.setAttribute('w:hanging', '1134');

        // שינוי היישור לשמאל (למניעת רווחים)
        let jc = this.getChildByTagName(pPr, 'w:jc');
        if (!jc) {
            jc = doc.createElement('w:jc');
            pPr.appendChild(jc);
        }
        jc.setAttribute('w:val', 'left');

        // הוספת טאב
        let tabs = this.getChildByTagName(pPr, 'w:tabs');
        if (!tabs) {
            tabs = doc.createElement('w:tabs');
            pPr.appendChild(tabs);
        }
        
        // בדיקה אם כבר יש טאב במיקום הזה
        const existingTabs = tabs.getElementsByTagName('w:tab');
        let hasTab = false;
        for (let i = 0; i < existingTabs.length; i++) {
            if (existingTabs[i].getAttribute('w:pos') === '1134') {
                hasTab = true;
                break;
            }
        }
        
        if (!hasTab) {
            const tab = doc.createElement('w:tab');
            tab.setAttribute('w:val', 'left');
            tab.setAttribute('w:pos', '1134');
            tabs.appendChild(tab);
        }
    }

    // יצירת קובץ סגנונות עם סגנון דיאלוג
    createStylesWithDialogue() {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:docDefaults>
                <w:rPrDefault>
                    <w:rPr>
                        <w:lang w:val="he-IL" w:bidi="he-IL"/>
                    </w:rPr>
                </w:rPrDefault>
            </w:docDefaults>
            
            <!-- סגנון לדיאלוג עם הזחה תלויה -->
            <w:style w:type="paragraph" w:customStyle="1" w:styleId="DialogueHanging">
                <w:name w:val="Dialogue Hanging"/>
                <w:basedOn w:val="Normal"/>
                <w:qFormat/>
                <w:pPr>
                    <w:bidi/>
                    <w:spacing w:after="200" w:line="280" w:lineRule="auto"/>
                    <w:ind w:left="1134" w:hanging="1134"/>
                    <w:jc w:val="left"/>
                    <w:tabs>
                        <w:tab w:val="left" w:pos="1134"/>
                    </w:tabs>
                </w:pPr>
                <w:rPr>
                    <w:rFonts w:ascii="David" w:hAnsi="David" w:cs="David"/>
                    <w:sz w:val="22"/>
                    <w:szCs w:val="22"/>
                    <w:lang w:val="he-IL" w:bidi="he-IL"/>
                </w:rPr>
            </w:style>
        </w:styles>`;
    }

    // עדכון הגדרות המסמך
    updateDocumentSettings(xmlContent) {
        const parser = new DOMParser();
        const serializer = new XMLSerializer();
        const doc = parser.parseFromString(xmlContent, 'text/xml');

        // הוספת/עדכון themeFontLang לעברית
        let themeFontLang = doc.getElementsByTagName('w:themeFontLang')[0];
        if (!themeFontLang) {
            const settings = doc.getElementsByTagName('w:settings')[0];
            themeFontLang = doc.createElement('w:themeFontLang');
            settings.appendChild(themeFontLang);
        }
        themeFontLang.setAttribute('w:val', 'he-IL');
        themeFontLang.setAttribute('w:bidi', 'he-IL');

        return serializer.serializeToString(doc);
    }

    // פונקציית עזר לחיפוש ילד לפי שם תג
    getChildByTagName(parent, tagName) {
        const children = parent.childNodes;
        for (let i = 0; i < children.length; i++) {
            if (children[i].nodeName === tagName) {
                return children[i];
            }
        }
        return null;
    }

    // המרת תיקייה שלמה
    async convertFolder(folderPath, outputFolder = null, options = {}) {
        try {
            console.log('📂 סורק תיקייה:', folderPath);
            
            // יצירת תיקיית פלט אם לא סופקה
            if (!outputFolder) {
                outputFolder = path.join(folderPath, 'hebrew_converted');
            }

            // יצירת התיקייה אם לא קיימת
            if (!fs.existsSync(outputFolder)) {
                fs.mkdirSync(outputFolder, { recursive: true });
            }

            // קריאת כל הקבצים בתיקייה
            const files = fs.readdirSync(folderPath);
            const docxFiles = files.filter(file => file.endsWith('.docx'));

            console.log(`🔍 נמצאו ${docxFiles.length} קבצי Word`);

            for (const file of docxFiles) {
                const inputPath = path.join(folderPath, file);
                const outputPath = path.join(outputFolder, file);
                
                console.log(`\n📝 ממיר: ${file}`);
                await this.convertFile(inputPath, outputPath, options);
            }

            console.log('\n✅ כל הקבצים הומרו בהצלחה!');
            console.log('📁 הקבצים נשמרו ב:', outputFolder);

        } catch (error) {
            console.error('❌ שגיאה:', error.message);
            throw error;
        }
    }
}

// ================== הרצה מהטרמינל ==================

if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║              ממיר מסמכי Word לעברית - Node.js                ║
╚══════════════════════════════════════════════════════════════╝

📋 שימוש:
  node word-hebrew-converter.js <קובץ או תיקייה> [קובץ/תיקיית פלט] [--no-dialogue]

📌 דוגמאות:
  1. המרת קובץ בודד עם עיצוב דיאלוג:
     node word-hebrew-converter.js document.docx
     
  2. המרת קובץ בלי עיצוב דיאלוג:
     node word-hebrew-converter.js document.docx output.docx --no-dialogue
     
  3. המרת כל הקבצים בתיקייה:
     node word-hebrew-converter.js ./documents
     
  4. המרת תיקייה עם תיקיית פלט מותאמת:
     node word-hebrew-converter.js ./documents ./hebrew_docs

📝 תכונות:
  • המרת השפה מאנגלית לעברית
  • עיצוב אוטומטי של פסקאות דיאלוג עם הזחה תלויה
  • שמירה על כל העיצוב המקורי
  • תמיכה בקבצי .docx בלבד

💡 עיצוב דיאלוג:
  • הקוד מזהה אוטומטית פסקאות עם מבנה "דובר: טקסט"
  • מוסיף הזחה תלויה של 2 ס"מ
  • משנה יישור לשמאל למניעת רווחים מכוערים
  • להשבית: הוסף --no-dialogue בסוף הפקודה
        `);
        process.exit(0);
    }

    const converter = new WordHebrewConverter();
    const inputPath = args[0];
    let outputPath = null;
    let options = { dialogue: true };

    // בדיקת ארגומנטים
    if (args[1] && !args[1].startsWith('--')) {
        outputPath = args[1];
    }
    
    // בדיקה אם יש --no-dialogue
    if (args.includes('--no-dialogue')) {
        options.dialogue = false;
    }

    // בדיקה אם זה קובץ או תיקייה
    if (fs.existsSync(inputPath)) {
        const stats = fs.statSync(inputPath);
        
        if (stats.isFile()) {
            // המרת קובץ בודד
            converter.convertFile(inputPath, outputPath, options)
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        } else if (stats.isDirectory()) {
            // המרת תיקייה
            converter.convertFolder(inputPath, outputPath, options)
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        }
    } else {
        console.error('❌ הקובץ או התיקייה לא נמצאו:', inputPath);
        process.exit(1);
    }
}

module.exports = WordHebrewConverter;