/**
 * פונקציית המרת Word ל-TXT עם שמירת טאבים
 * מותאם למערכת CRM לתמלול
 * דרישות: JSZip library
 */

class WordConverter {
    
    /**
     * המרת קובץ Word לטקסט לשימוש במערכת CRM
     * @param {File} file - קובץ Word (.docx)
     * @returns {Promise<string>} הטקסט המומר
     */
    async convertWordToText(file) {
        if (!file.name.toLowerCase().endsWith('.docx')) {
            throw new Error('נא לבחור קובץ Word (.docx)');
        }
        
        const documentData = await this.readWordDocument(file);
        return this.convertToText(documentData);
    }
    
    /**
     * קריאת קובץ Word וחילוץ הנתונים
     * @param {File} file - קובץ Word
     * @returns {Promise<Array>} מערך פסקאות עם טאבים
     */
    async readWordDocument(file) {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        
        const documentXml = await zipContent.file('word/document.xml').async('string');
        return this.parseDocumentXml(documentXml);
    }
    
    /**
     * פענוח XML של המסמך
     * @param {string} xmlString - תוכן XML
     * @returns {Array} מערך פסקאות
     */
    parseDocumentXml(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        
        const paragraphs = [];
        const pElements = xmlDoc.querySelectorAll('w\\:p, p');
        
        pElements.forEach((paragraph, pIndex) => {
            const paragraphData = {
                index: pIndex,
                text: '',
                runs: [],
                hasTab: false
            };
            
            const runs = paragraph.querySelectorAll('w\\:r, r');
            
            runs.forEach((run, rIndex) => {
                const runData = {
                    index: rIndex,
                    text: '',
                    hasTab: false
                };
                
                // בדיקה אם יש טאב
                const tabs = run.querySelectorAll('w\\:tab, tab');
                if (tabs.length > 0) {
                    runData.hasTab = true;
                    paragraphData.hasTab = true;
                }
                
                // חילוץ הטקסט
                const textElements = run.querySelectorAll('w\\:t, t');
                textElements.forEach(textElement => {
                    runData.text += textElement.textContent || '';
                });
                
                paragraphData.runs.push(runData);
                
                // הוספת טאב לטקסט הכללי במיקום המקורי
                if (runData.hasTab) {
                    paragraphData.text += '\t';
                }
                paragraphData.text += runData.text;
            });
            
            paragraphs.push(paragraphData);
        });
        
        return paragraphs;
    }
    
    /**
     * המרה לטקסט עם שמירת טאבים
     * @param {Array} documentData - נתוני המסמך
     * @returns {string} הטקסט המומר
     */
    convertToText(documentData) {
        let content = '';
        
        documentData.forEach((paragraph) => {
            if (paragraph.text.trim()) {
                content += `${paragraph.text}\n`;
            }
        });
        
        return content;
    }
    
    /**
     * פונקציה עזר לבדיקה אם קובץ הוא Word
     * @param {File} file - הקובץ לבדיקה
     * @returns {boolean} האם זה קובץ Word
     */
    isWordFile(file) {
        const fileName = file.name.toLowerCase();
        return fileName.endsWith('.docx');
    }
}

// פונקציות גלובליות לשימוש בטפסים
window.WordConverter = WordConverter;

/**
 * פונקציית עזר להמרת קובץ Word לטקסט
 * @param {File} file - הקובץ להמרה
 * @returns {Promise<string>} הטקסט המומר
 */
async function convertWordFileToText(file) {
    const converter = new WordConverter();
    return await converter.convertWordToText(file);
}

/**
 * פונקציית עזר לבדיקה אם צריך המרה
 * @param {File} file - הקובץ לבדיקה
 * @returns {boolean} האם צריך המרה
 */
function needsConversion(file) {
    return file.name.toLowerCase().endsWith('.docx');
}

// הפיכת הפונקציות לגלובליות
window.convertWordFileToText = convertWordFileToText;
window.needsConversion = needsConversion;