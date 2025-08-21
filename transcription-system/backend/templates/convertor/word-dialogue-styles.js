// word-dialogue-styles.js
// מוסיף סגנונות דיאלוג מותאמים למסמכי Word

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

class WordDialogueStyler {
    constructor() {
        this.styleDefinitions = this.createStyleDefinitions();
    }

    // יצירת הגדרות הסגנונות לדיאלוגים
    createStyleDefinitions() {
        return `
            <!-- סגנון לשם הדובר -->
            <w:style w:type="paragraph" w:customStyle="1" w:styleId="DialogueSpeaker">
                <w:name w:val="Dialogue Speaker"/>
                <w:basedOn w:val="Normal"/>
                <w:qFormat/>
                <w:pPr>
                    <w:bidi/>
                    <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
                    <w:ind w:left="0" w:right="0" w:hanging="1700"/>
                    <w:jc w:val="right"/>
                    <w:tabs>
                        <w:tab w:val="left" w:pos="1700"/>
                    </w:tabs>
                </w:pPr>
                <w:rPr>
                    <w:rFonts w:ascii="David" w:hAnsi="David" w:cs="David"/>
                    <w:b/>
                    <w:bCs/>
                    <w:sz w:val="24"/>
                    <w:szCs w:val="24"/>
                    <w:lang w:val="he-IL" w:bidi="he-IL"/>
                </w:rPr>
            </w:style>

            <!-- סגנון לטקסט הדיאלוג -->
            <w:style w:type="paragraph" w:customStyle="1" w:styleId="DialogueText">
                <w:name w:val="Dialogue Text"/>
                <w:basedOn w:val="Normal"/>
                <w:qFormat/>
                <w:pPr>
                    <w:bidi/>
                    <w:spacing w:after="120" w:line="240" w:lineRule="auto"/>
                    <w:ind w:left="0" w:right="0" w:firstLine="0"/>
                    <w:jc w:val="both"/>
                </w:pPr>
                <w:rPr>
                    <w:rFonts w:ascii="David" w:hAnsi="David" w:cs="David"/>
                    <w:sz w:val="22"/>
                    <w:szCs w:val="22"/>
                    <w:lang w:val="he-IL" w:bidi="he-IL"/>
                </w:rPr>
            </w:style>

            <!-- סגנון לדיאלוג עם הזחה תלויה (Hanging Indent) -->
            <w:style w:type="paragraph" w:customStyle="1" w:styleId="DialogueHanging">
                <w:name w:val="Dialogue Hanging"/>
                <w:basedOn w:val="Normal"/>
                <w:qFormat/>
                <w:pPr>
                    <w:bidi/>
                    <w:spacing w:after="200" w:line="280" w:lineRule="auto"/>
                    <w:ind w:left="2000" w:right="0" w:hanging="2000"/>
                    <w:jc w:val="both"/>
                    <w:tabs>
                        <w:tab w:val="left" w:pos="2000"/>
                    </w:tabs>
                </w:pPr>
                <w:rPr>
                    <w:rFonts w:ascii="David" w:hAnsi="David" w:cs="David"/>
                    <w:sz w:val="22"/>
                    <w:szCs w:val="22"/>
                    <w:lang w:val="he-IL" w:bidi="he-IL"/>
                </w:rPr>
            </w:style>

            <!-- סגנון לדיאלוג עם יישור שמאלה (למניעת רווחים) -->
            <w:style w:type="paragraph" w:customStyle="1" w:styleId="DialogueLeft">
                <w:name w:val="Dialogue Left Aligned"/>
                <w:basedOn w:val="Normal"/>
                <w:qFormat/>
                <w:pPr>
                    <w:bidi/>
                    <w:spacing w:after="200" w:line="280" w:lineRule="auto"/>
                    <w:ind w:left="2000" w:right="0" w:hanging="2000"/>
                    <w:jc w:val="left"/>
                    <w:tabs>
                        <w:tab w:val="left" w:pos="2000"/>
                    </w:tabs>
                </w:pPr>
                <w:rPr>
                    <w:rFonts w:ascii="David" w:hAnsi="David" w:cs="David"/>
                    <w:sz w:val="22"/>
                    <w:szCs w:val="22"/>
                    <w:lang w:val="he-IL" w:bidi="he-IL"/>
                </w:rPr>
            </w:style>

            <!-- סגנון לכותרת סצנה -->
            <w:style w:type="paragraph" w:customStyle="1" w:styleId="SceneHeading">
                <w:name w:val="Scene Heading"/>
                <w:basedOn w:val="Normal"/>
                <w:qFormat/>
                <w:pPr>
                    <w:bidi/>
                    <w:spacing w:before="400" w:after="200"/>
                    <w:jc w:val="center"/>
                </w:pPr>
                <w:rPr>
                    <w:rFonts w:ascii="David" w:hAnsi="David" w:cs="David"/>
                    <w:b/>
                    <w:bCs/>
                    <w:sz w:val="28"/>
                    <w:szCs w:val="28"/>
                    <w:lang w:val="he-IL" w:bidi="he-IL"/>
                </w:rPr>
            </w:style>
        `;
    }

    // הוספת סגנונות למסמך קיים
    async addStylesToDocument(inputPath, outputPath = null) {
        try {
            console.log('📄 קורא את הקובץ:', inputPath);
            
            if (!fs.existsSync(inputPath)) {
                throw new Error('הקובץ לא נמצא');
            }

            if (!outputPath) {
                const dir = path.dirname(inputPath);
                const filename = path.basename(inputPath, '.docx');
                outputPath = path.join(dir, `${filename}_styled.docx`);
            }

            const content = fs.readFileSync(inputPath);
            const zip = new PizZip(content);

            console.log('🎨 מוסיף סגנונות דיאלוג...');

            // עיבוד styles.xml
            let stylesXml;
            if (zip.file('word/styles.xml')) {
                stylesXml = zip.file('word/styles.xml').asText();
            } else {
                // יצירת קובץ סגנונות חדש אם לא קיים
                stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                    </w:styles>`;
            }

            // הוספת הסגנונות החדשים
            const updatedStyles = this.addStylesToXml(stylesXml);
            zip.file('word/styles.xml', updatedStyles);

            // שמירת הקובץ
            const outputContent = zip.generate({ 
                type: 'nodebuffer',
                compression: 'DEFLATE'
            });

            fs.writeFileSync(outputPath, outputContent);
            
            console.log('✅ הסגנונות נוספו בהצלחה!');
            console.log('📁 הקובץ נשמר ב:', outputPath);
            console.log('\n📋 סגנונות זמינים:');
            console.log('  1. Dialogue Speaker - לשם הדובר');
            console.log('  2. Dialogue Text - לטקסט רגיל');
            console.log('  3. Dialogue Hanging - עם הזחה תלויה (מומלץ!)');
            console.log('  4. Dialogue Left Aligned - יישור שמאלה (מונע רווחים)');
            console.log('  5. Scene Heading - לכותרות סצנה');
            
            return outputPath;

        } catch (error) {
            console.error('❌ שגיאה:', error.message);
            throw error;
        }
    }

    // הוספת סגנונות ל-XML
    addStylesToXml(xmlContent) {
        const parser = new DOMParser();
        const serializer = new XMLSerializer();
        const doc = parser.parseFromString(xmlContent, 'text/xml');

        const stylesElement = doc.getElementsByTagName('w:styles')[0];
        
        // בדיקה אם הסגנונות כבר קיימים
        const existingStyles = doc.getElementsByTagName('w:style');
        const styleIds = new Set();
        for (let i = 0; i < existingStyles.length; i++) {
            const styleId = existingStyles[i].getAttribute('w:styleId');
            styleIds.add(styleId);
        }

        // הוספת הסגנונות החדשים
        const tempDoc = parser.parseFromString(
            `<root xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                ${this.styleDefinitions}
            </root>`, 
            'text/xml'
        );

        const newStyles = tempDoc.getElementsByTagName('w:style');
        for (let i = 0; i < newStyles.length; i++) {
            const newStyle = newStyles[i];
            const styleId = newStyle.getAttribute('w:styleId');
            
            // הוספה רק אם הסגנון לא קיים
            if (!styleIds.has(styleId)) {
                const importedStyle = doc.importNode(newStyle, true);
                stylesElement.appendChild(importedStyle);
            }
        }

        return serializer.serializeToString(doc);
    }

    // יצירת תבנית חדשה עם דוגמאות
    async createTemplate(outputPath = 'dialogue_template.docx') {
        try {
            console.log('🎨 יוצר תבנית דיאלוג חדשה...');

            // יצירת מסמך Word בסיסי עם docx library
            const Docx = require('docx');
            const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = Docx;

            const doc = new Document({
                styles: {
                    paragraphStyles: [
                        {
                            id: "DialogueHanging",
                            name: "Dialogue Hanging",
                            basedOn: "Normal",
                            next: "DialogueHanging",
                            paragraph: {
                                spacing: { after: 200, line: 280 },
                                indent: { left: 2000, hanging: 2000 },
                                alignment: AlignmentType.JUSTIFIED,
                                rightToLeft: true
                            },
                            run: {
                                font: "David",
                                size: 22
                            }
                        },
                        {
                            id: "DialogueLeft",
                            name: "Dialogue Left",
                            basedOn: "Normal",
                            paragraph: {
                                spacing: { after: 200, line: 280 },
                                indent: { left: 2000, hanging: 2000 },
                                alignment: AlignmentType.LEFT,
                                rightToLeft: true
                            },
                            run: {
                                font: "David",
                                size: 22
                            }
                        }
                    ]
                },
                sections: [{
                    properties: {
                        rtl: true
                    },
                    children: [
                        new Paragraph({
                            text: "תבנית דיאלוג - הוראות שימוש",
                            heading: HeadingLevel.HEADING_1,
                            alignment: AlignmentType.CENTER
                        }),
                        new Paragraph({
                            text: "",
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            text: "דוגמה עם Dialogue Hanging (מומלץ):",
                            heading: HeadingLevel.HEADING_2
                        }),
                        new Paragraph({
                            style: "DialogueHanging",
                            children: [
                                new TextRun({ text: "אפרים:", bold: true }),
                                new TextRun({ text: "\t" }),
                                new TextRun({ text: "זהו טקסט דיאלוג עם הזחה תלויה. כשתרד שורה, הטקסט יוזח אוטומטית. אפשר להמשיך לכתוב והכל יסתדר לבד." })
                            ]
                        }),
                        new Paragraph({
                            style: "DialogueHanging",
                            children: [
                                new TextRun({ text: "ברכה:", bold: true }),
                                new TextRun({ text: "\t" }),
                                new TextRun({ text: "כדי לבדוק איך זה עובד עם טקסט ארוך, אני אכתוב פה משפט ממש ארוך שבטוח יעבור כמה שורות. הטקסט ימשיך וימשיך וימשיך עד שיגיע לשורה הבאה ונראה שהכל מסתדר יפה." })
                            ]
                        }),
                        new Paragraph({
                            text: "",
                            spacing: { after: 400 }
                        }),
                        new Paragraph({
                            text: "דוגמה עם Dialogue Left (יישור שמאלה - מונע רווחים):",
                            heading: HeadingLevel.HEADING_2
                        }),
                        new Paragraph({
                            style: "DialogueLeft",
                            children: [
                                new TextRun({ text: "אפרים:", bold: true }),
                                new TextRun({ text: "\t" }),
                                new TextRun({ text: "עם יישור שמאלה אין רווחים מוזרים בסוף השורה. זה טוב במיוחד כשיש Shift+Enter." })
                            ]
                        }),
                        new Paragraph({
                            style: "DialogueLeft",
                            children: [
                                new TextRun({ text: "ברכה:", bold: true }),
                                new TextRun({ text: "\t" }),
                                new TextRun({ text: "נכון, זה נראה יותר נקי." })
                            ]
                        })
                    ]
                }]
            });

            const buffer = await Packer.toBuffer(doc);
            fs.writeFileSync(outputPath, buffer);

            // עכשיו נוסיף את הסגנונות המלאים
            await this.addStylesToDocument(outputPath, outputPath);

            console.log('✅ התבנית נוצרה בהצלחה!');
            console.log('📁 התבנית נשמרה ב:', outputPath);
            
            return outputPath;

        } catch (error) {
            console.error('❌ שגיאה ביצירת התבנית:', error.message);
            throw error;
        }
    }
}

// הרצה מהטרמינל
if (require.main === module) {
    const args = process.argv.slice(2);
    const styler = new WordDialogueStyler();
    
    if (args.length === 0 || args[0] === '--help') {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║             מוסיף סגנונות דיאלוג למסמכי Word                ║
╚══════════════════════════════════════════════════════════════╝

📋 שימוש:
  node word-dialogue-styles.js <פעולה> [קובץ]

📌 פעולות:
  template                  - יצירת תבנית חדשה
  add <קובץ>               - הוספת סגנונות לקובץ קיים
  
📌 דוגמאות:
  1. יצירת תבנית:
     node word-dialogue-styles.js template
     
  2. הוספת סגנונות למסמך:
     node word-dialogue-styles.js add document.docx

💡 טיפים לשימוש ב-Word:
  • בחר בסגנון Dialogue Hanging לדיאלוגים
  • השתמש ב-Tab אחרי שם הדובר
  • הטקסט יוזח אוטומטית בשורות הבאות
  • לא צריך Shift+Enter - פשוט Enter רגיל
        `);
        process.exit(0);
    }

    const action = args[0];
    
    if (action === 'template') {
        const outputPath = args[1] || 'dialogue_template.docx';
        styler.createTemplate(outputPath)
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    } else if (action === 'add' && args[1]) {
        const inputPath = args[1];
        const outputPath = args[2] || null;
        styler.addStylesToDocument(inputPath, outputPath)
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    } else {
        console.error('❌ פעולה לא חוקית. הרץ --help לעזרה');
        process.exit(1);
    }
}

module.exports = WordDialogueStyler;