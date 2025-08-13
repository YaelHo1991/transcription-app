# Media Player Requirements Specification

## 1. Project Overview
<!-- Describe the purpose of this media player and where it will be used -->
**Purpose:** 
נגן מדיה לצורך תמלול. צריכים להיות לו פיצ'רים מיוחדים שיקלו על תמלול, הפעלה, עצירה, העתקת נקודות זמן, תקשור עם הטקסט אדיטור. הוא צריך להיראות מודרני - אבל לשמור על הצבעוניות הכללית של הדף - בגווני הירוק והטורקיז כמו הצבעים שמופיעים בסרגלי הכלים, העליון והצדדי. עדיף צבעים כהים, עם נגיעות של צבעים בהירים. הוא לא אמור להיות גדול מידי - כי הוא לא השחקן  הראשי, כך שהפונצקיות שלו צריכות להיות כמה שיותר מינימליסטיות. 

**Context:** 
במערכת יש שלוש מערכות גדולות - מערכת למכירת רישיונות; מערכת CRM ואפליקציית תמלול. 
כרגע אנחנו בפיתוח של אפליקציית התמלול ויש בה חמישה עמודים, שניים - דף הבית לניווט ודף אחד של דוחות ורישומים - ושלושה דפים עיקריים עם אפליקציות מוטמעות - תמלול, הגהה וייצוא. 
כרגע אנחנו מתמקדים בעמוד התמלול. לעמוד התמלול יש מספר אובייקטים שחלק מהם מתקשרים זה עם זה - כמו למשל, הטקסט אדיטור לוקח חותמות זמן מהמדיה פלייר וכדומה. 
כל רכיב מפותח בפני עצמו. כרגע המיקוד הוא על המדיה פלייר. 
המדיה פלייר לא צריך להעלות מדיה - המדיה מועלית באמצעות סרגל הכלים הצדדים ובאמצעות פס ניווט עליון שמנווט בין פרויקטים ובין מדיות שונות בתוך כל פרויקט וטוען אותה לתוך המדיה פלייר. המדיה פלייר מטפל רק בנגינה של המדיה ובהפעלת כל הפיצ'רים . 

הפיצ'רים:
1. פרוגרס בר - רגיל כמו בכל מדיה פלייר קלאסי. עדיף שהוא ייראה מעוצב, תוך התחשבות בגודל הקונטיינר של המדיה פלייר, אבל הוא צריך להיות מדויק ולאפשר מעבר חלק ככל הניתן, כדי לעבור בקלות לנקודות זמן. 
2. טיים סטאמפ - נקודת ההתחלה 00:00:00 והסיום - משך המדיה בסוף, למשל 01::20:10. שתי חותמות הזמן הללו משמשות גם כקפיצה לנקודות זמן - בלחיצה אחת על העכבר הסמן נכנס לתיבה, הטיימר עוצר (במקרה שמדובר בחותמת הזמן של ההתחלה, ואפשר להזין את נקודת הזמן אליה רוצים לקפוץ במדיה. בלחיצה על אנטר המדיה עוברת לנקודת הזמן הזו וחותמת הזמן חוזרת למצ (או לטיימר או למשך הזמן הכולל) בלחיצה כפולה - המדיה תעבור או לתחילת הקובץ או לסוף הקובץ. 
3. פלייבק קונטרולס - פליי.פאוס  קלאסיים. חזרה לאחור - יש לאפשר גם 2.5 וגם 5 שניות. חשוב לציין - גם הפרוגרס בר וגם הקונטרולס הללו יהיה מימין לשמאל, כי זו מערכת עבררית. לכן למעשה חץ שמאלי מסמל התקדמות, לא חזרה אחורה ולהיפך. חשוב לציין - בכל הגדלים השונים של המסך, חצי מסך, מסך גדול וכדומה - הריווח משתנה וכל האלמנטים צריכים להתאים את עצמם. לכן צריך לחשוב על מצבים שונים, ולמשל במסכים מאוד מאוד קטנים - אפשר למשל להשתמש רק באייקונים. כשהמסך גדול יותר - אפשר להשתמש ביותר ריווח ובאייקונים וגם מלל, לצורך הדוגמא. בכל מקרה יש להיות חסכן עם המקום - שהקונטיינר הכללי לא יתפוס את כל שטח העמוד. ארחיב על כך בהמשך. 
4. סליידרס - אחד לווליום ואחד למהירות ההשמעה. בלחיצה על אייקון הרמקול - הווליום הופך להשתק/מבטל השתקה. לחיצה אחת על אייקון המהירות - המהירות עולה, לחיצה כפולה - המהירות חוזרת לברירת המחדל. 
5. אייקון הגדרות - ארחיב עליו בפני עצמו
6. וידאו - ברירת המחדל היא אודיו, כי לרוב הקבצים הם אודיו. כאשר המדיה היא וידאו - הקונטיינר של המדיה פלייר יזוז מעט הצידה, ייתן מקום לקוביית וידאו להיכנס. ברירת המחדל קובייה קטנה, שמתאימה לגודל הקונטיינר של המדיה פלייר - כלומר לאורך המדייה פלייר, ובגודל של השטח שהתפנה עבורה. אבל, צריך לאפשר לגרור אותה על פני כל עמוד התמלול - כולל על אובייקטים אחרים כמו הטקס אדיטור וכו'. צריך לאפשר שינוי גודל של הקובייה לגודל הרצוי. יהיו שלושה אייקונים בקובייה למעלה - X, -, ואייקון של ריסטור. ה- X יסגור את הקובייה, יחזיר את הקונטיינר למצב המקורי שלו ויוסיף אייקון להקפצת הקובייה מחדש. במקרה של X כשהקובייה תיפתח מחדש, היא תחזור לגודל ולמיקום של ברירת המחדל. ה - ייעשה את אותו הדבר, כלומר המדיה יחזור לגודל הרגיל שלו, הקובייה תיעלם ויופיע אייקון לריסטור. אבל כשנלחץ על הריסטור הקובייה של הווידאו תיפתח באותו מיקום ובאותו גודל שבו היא נסגרה. האייקון של הריסטור, הרגיל, פשוט יחזיר את הקובייה למצב ברירת מחדל - גם גודל וגם מיקום. 


עכשיו על אייקון ההגדרות. 
בהגדרות יש שליטה על נגן המדיה פלייר. 
חלון ההגדרות נפתח מעל כל האובייקטים, עם רקע שחור שקוף. יש בו שלוש כרטיסיות - קיצורי מקלדת, פדל וזיהוי אוטומטי. 

## קיצורי מקלדת - אפשר לבחור את כל הקיצורים הרגילים הקלאסיים, אבל בתוספת עם הכפתורים המיוחדים
 - כמו שתי מהירויות נוספות, האצת מהירות, איפוס מהירות, הנמכת שמע, הגברת שמע. 
 בנוסף, אפשר לכבות את הפדל, לכבות את הזיהוי אוטומטי, או להחליף בין מצבי הזיהוי (יש שני מצבי זיהוי). 
 חשוב לגבי הקיצורים - כל מקשי המקלדת משתתפים בקיצורים. גם למשל F1 וכו' יכולים להפעיל את המדיה ולהיות מוגדרים. 
 הפעולה המקורית של המקש במקרה כזה תנוטרל רק אם המקש ייבחר. 
 כמובן, הם ידרסו את קיצורי ברירת המחדל של המערכת 
 למשל, אם ספייס משמש לעצור/נגן ונבחר 1 במקום, אז ספייס לא ישמש יותר לעצור/נגן. 
 כמובן, המערכת תתריע אם נבחר קיצור אחד אותו דבר. 
קיצורי המקדלת יעבדו בכל העמוד של התמלול, כלומר, לא רק בתוך הקונטיינר
של המדיה פלייר. 
 - בעיקר גם כמובן בתוך הטקסט אדיטור. 
אלא שבטקסט אדיטור, מכיוון שצריך להקליד שם את הטקסט, אז אם נבחר מקש קיצור שמתנגש עם הכתיבה - הוא יגבר עליו. 
למשל, אם נבחר ספייס כקיצור, אז בתוך הטקסט אדיטור בלבד הקיצור של הספייס לא יעבוד. שאר הקיצורים - שלא מתנגשים, ימשיכו לעבוד כרגיל. 
גם בתיבת הדוברים ובתיבת ההערות העיקרון יהיה זהה. 
ייתכן שיש להגדיר את ההגדרות האלה בתוך האובייקטים עצמם ובינתיים רק להכין את השטח, כשנכתוב את שאר האובייקטים. 
***נקודה חשובה לשים לב - מכיוון שכיוון הנגינה הוא מימין לשמאל, הקיצורים שמוגדרים לנגינה
אחורה וקדימה צריכים להיות מוגדרים בהתאם****
*** צריך להוסיף אפשרות של חזרה אחורה בכל מקרה של עצירת המדיה**

## כרטיסיית הפדל - חיבור פדל רגלי לשליטה על המדיה. 
עד כה זה עבד מעולה באמצעות HID. 
הרעיון הוא לחבר את הפדל ולאפשר למשתמש להגדיר איזו פעולה כל מקש יבצע. 
ברירת המחדל צריכה להיות - מקש אמצעי נגן/השהה. מקש ימני - הרץ אחורה, מקש שמאלי - הרץ קדימה. 
יש לזכור את ההעדפות של המשתמש
יש לזכור מכשירים שכבר חוברו ולהשאיר אותם מחוברים ככל הניתן, למנוע כמה שיותר חיבורים מחודשים. 
יש כפתור כללי לכיבוי/הפעלת הדוושה. אפשר להקיש מקש קיצור גם לכך. 
כאשר לוחצים ממושכות על קדימה/אחורה - המדיה חוזרת אחורה ברציפות, או קדימה ברציפות. 

##  כרטיסיית זיהוי  אוטומטי
יש בו שני מצבים - מצב רגיל ומצב משופר. שניהם בשתי תתי כרטיסיות. 

מצב רגיל:
המערכת מזהה הקלדה. כאשר המשתמש מקליד בטקסט אדיטור (בלבד! לא בדוברים ולא בהערות) המדיה נעצרת. 
כאשר ההקלדה נעצרת ל- 0.5 (בברירת מחדל, אבל אפשר לבחור שיהוי ארוך יותר), אז המדיה חוזרת להתנגן

מצב משופר:
המערכת מזהה הקלדה. המדיה מתנגנת עם ההקלדה. עם עצירה ראשונה של 0.5 שניות (או כפי שיגדיר המשתמש), המדיה נעצרת. 
לאחר שהמדיה נעצרת מתחדשת ההקלדה, אבל המדיה עדיין בעצירה. כאשר מזוהה הפסקה נוספת, שנייה בהקלדה של שנייה (או כפי שיגדיר המשתמש), 
המדיה תחזור להתנגן. 
במצב של עצירה - אחרי השיהוי הראשון בהקלדה, אם לא זוהתה הקלדה ב- 1.5 שניות (או כפי שיגדיר המשתמש) המדיה תמשיך 
להתנגן בכל מקרה. 
זאת אומרת, סך הכול ישנם שלושה שדות:
1. עצירה ראשונה בהקלדה - לעצירת המדיה (בחירת אורך ההפסקה)
2. עצירה שנייה בהקלדה - להמשך המדיה (בחירת אורך ההפסקה)
3. המשך המדיה בכל מקרה לאחר עצירה ראשונה, כשלא מזוהה הקלדה (בחירת אורך הזמן שלא מזוהה הקלדה עד להפעלה מחודשת)

גם לגבי הפדל וגם לגבי הזיהוי האוטומטי  וגם לגבי המקלדת צריך לאפשר לבחור חזרה לאחור 0.5 שניות (או כמה שירצו) במקרה של עצירה. 

בכל אחד מהחלונות יהיה כפתור לכיבוי/הפעלת החלון
(בקיצורי הדרך לא יכובו הקיצורים של המעבר מעמודה לעמודה או של כיבוי הדוושה/ הזיהוי האוטמטי, או שיהיה כפתור לכבות אותם ידני)


אלו הביצועים הטכניים. 


לגבי אייקון ההגדרות - יש כבר קודים JS מוגדרים לרוב הפיצ'רים. הם פשוט לא מותאמים לנגן המדיה. 
קיצורי המקלדת דורשים קצת שיפור - אבל הפדל והזיהוי האוטומטי עובדים. 
אתה יכול לכתוב מחדש ורק להיעזר בקוד הישן, אם זה יהיה יותר פשוט, אבל הלוגיקה כבר קיימת ועובדת. 


לנגן המדיה - יש לכתוב מחדש, כי יש בלגן שלם בקוד המוגדר. 


לגבי העיצוב - העיצוב של העמודות ושל חלון ההגדרות הוא עיצוב טוב, אני רוצה לשמור עליו במדויק. יש קבצי CSS לכל חלון. 
רק את החלון עצמו תוכל לעצב אחרת אם יהיה יותר קל, אבל את התוכן בכל חלון - יש לייבא. 

לגבי המדיה פלייר - יש לעצב מחדש. הנגן צריך להיראות חדשני, אבל מינימליסטי. הוא לא יכול לתפוס יותר מידי משטח העמוד באופן יחסי. 
המיקום של אלמנט חייב להיות נכון ומדויק ומיושר כמו שצריך. 
האלמנטים, הרכיבים, האייקונים חייבים להיות כל הזמן ממוקמים נכון בתוך הקונטיינר. 
חשוב מאוד לחשוב על כל גדלי המסך - יש מסכים גדולים, 21, 27 אינץ' וגם מסכי מחשב קטנים. 
לפעמים פותחים חצי חלון ורבע חלון, כך שהשטח של המדיה פלייר יכול להיות מאוד קטן. 
אני רוצה שתיתן התייחסות לגדלים, וממש להגדיר לייאאוט שונה בכל המצבים. כאשר יש את קוביית הווידאו - הקונייטנר יגדל מעט,
יחסית לעמוד, 
אבל הרכיבים עצמם יידחקו מעט. אז איך זה ייראה?
איך זה ייראה על מסך גדול, קטן.
איך אתה מוודא שהרכיבים יידבקו לקונטיינר ולא יזלגו החוצה ממנו או שיתחבאו בפנים ולא תהיה גישה. 
אפשר להקטין/להגדיל את האייקונים. 
במקרה של תצוגה ממש קטנה אפשר למשל להוריד טקסט ולהשאיר רק אייקון - למשל עבור כפתורי ההרצה קדימה אחורה.
כלומר, מצד אחד, אם המסך גדול צריך לראות מרווח ויפה - שלא יהיה הרבה חלל. מצד שני, אם המסך קטן 
אז יש לסדר את הרכיבים מחדש, בצורה יעילה וחכמה, להקטין, לשנות את הסדר, להוריד טקסט אם צריך, 
או להשתמש בטכניקות אחרות כך שעדיין תהיה גישה לכל האלמטנים.



סידור וארגון הקוד. 
כל מה שקשור למדיה פלייר עצמו יהיה בתיקיית המדיה פלייר. 
אם יש קודים שקשורים גם לממשקים אחרים, אז צריך לחשוב על תיקייה במקום מסודר אחר, 
למשל של SHARED או של COMMUNICATION. 
יש לראות גם איך לעשות זאת בצורה שאחר כך יהיה קל להתחבר עם אותם חלקי קוד, בלי לפרק את מה שכבר קיים. 
להכניס כמה שיותר הערות וכמה שיותר הנחיות מסודרות לעבודה בהמשך. 
המבנה יהיה - אינדקס ראשי, כמה שיותר מינימלי, שיקרא אליו כמה שיותר חלקי קוד ב- JS וב- CSS בנפרד.
בתיקייה BACKUP יש  דוגמא של קוד קודם שכתבתי שבו היה מבנה שאהבתי. 
אחר כך היה לך קשה עם התקשורת כך שבסוף הגדרת יותר מידי פונקציות שוב ושוב והיה בלגן. 
אז ייתכן שיהיה יותר קל לכתוב קוד מרכזי ואחר כך לפצל. אבל צריך לחשוב על הארכיטקטורה כבר עכשיו. 

חשוב לשמור על אבטחה!
יש שני קונטיינרים לקליינט ולסרבר. בגדול אין כל כך צורך בגישה לשרת עבור המדיה פלייר, אבל יש לשים לזה לב!!


**Users:** 


---

## 2. CRITICAL REQUIREMENTS (MUST HAVE)
These features MUST work correctly before moving to optional features.

### Audio Playback
- [ ] Play button starts audio
- [ ] Pause button stops audio
- [ ] Play/Pause toggle works correctly
- [ ] Audio loads from provided source
- [ ] [Add more requirements]

### Progress Bar
- [ ] Shows current playback position
- [ ] Clicking on progress bar seeks to position
- [ ] Dragging progress bar works smoothly
- [ ] Progress updates in real-time during playback
- [ ] [Add more requirements]

### Time Display
- [ ] Shows current time (format: __)
- [ ] Shows total duration (format: __)
- [ ] Time updates during playback
- [ ] [Add more requirements]

### Basic Controls
- [ ] Forward button (skip __ seconds)
- [ ] Rewind button (skip __ seconds)
- [ ] Volume control
- [ ] [Add more requirements]

### [Add more critical sections]

---

## 3. OPTIONAL FEATURES (NICE TO HAVE)
These can be added after all critical requirements work perfectly.

### Advanced Controls
- [ ] Speed control (0.5x to 2x)
- [ ] 10-second skip buttons
- [ ] Keyboard shortcuts
- [ ] [Add more]

### Video Support
- [ ] Display video when video file is loaded
- [ ] Video sync with audio
- [ ] Video cube/window
- [ ] Draggable video window
- [ ] [Add more]

### [Add more optional sections]

---

## 4. DO NOT DO (AVOID THESE)
Based on previous issues, we will NOT do the following:

### Things to Avoid
- [ ] Don't add features not listed in requirements
- [ ] Don't use aggressive event prevention that breaks interactions
- [ ] Don't use continuous intervals for monitoring (use observers instead)
- [ ] אל תיצור מלא קבצים או קבצים חדשים, עבוד על הקיימים. 
- [ ] אל תכתוב קוד שידרוס קוד אחר, אם אתה לא מוצא את הבאג. 
- [ ] אל תכתוב שום פונקציה או שום קוד בלי לוודא קודם שאין אחד אחר שמטפל בזה. 
- [ ] אל תכתוב מחדש קוד בלי לשאול אותי, במיוחד לא דברים עיצוביים או כשיש לוגיקה מורכבת מאחורי
---

## 5. RTL SPECIFIC REQUIREMENTS
Detailed Right-to-Left behavior requirements:

### Progress Bar RTL Behavior
- [ ] Progress bar fills from: [right-to-left OR left-to-right?]
- [ ] Visual direction of progress: [describe exactly how it should look]
- [ ] Click behavior in RTL: [where should clicking on the right side seek to?]
הפס יתקדם מימין לשמאל. בלחיצה על חלק ריק בשמאל, הפס מתקדם לכיוון שמאל. 

### Button Layout in RTL
- [ ] Button order from right to left: [List exact order]
  - Example: [Rewind] [Play] [Forward] or different?
- [ ] Icons direction: [Should arrows flip?]
החיצים יתחלפו. החץ הימני מעביר מדיה אחורה והשמאלי קדימה. כך זה גם צריך להיראות ויזואלית. 

### Time Display in RTL
- [ ] Time format: [00:00:00 stays LTR or changes?]
נשאר כרגיל - בעברית או באנגלית המספרים נכתבים אותו דבר. 
- [ ] Position: [Current time on right or left?]

### Sliders in RTL
- [ ] Volume slider direction: [min on right or left?]
- [ ] Speed slider direction: [slow on right or left?]
בצד ימין יהיה האייקון. המינימום מתחיל מימין. בצד השני יש את ה- 100% או את עוצמה הגבוהה ביותר. 

### [Add more RTL specifications]
שים לב שהרבה פעמים כשאתה מגדיר ימין זה בפועל שמאל - משהו משתנה ככל הנראה עם ההגדרות. 
חשוב ממש לשים לב!

---

## 6. UI/UX REQUIREMENTS

### Layout
- [ ] Container direction: [RTL or LTR?] RTL
- [ ] Component spacing: [Describe spacing requirements]
- [ ] Responsive behavior: [How should it adapt to different screen sizes?]
מרווח - כתבתי גם למעלה, צריך להיות מרווח ואייקונים גדולים ככל שהמסך מאפשר. 
ככל שהמסך יהיה קטן, האייקונים יהיו קטנים, המרווחים ביניהם קטנים יותר
ואיפה שאפשר להוריד מלל למשל ולהשאיר רק אייקון קטן - עדיף. 
אפשר גם לשנות את התצורה וסדר הצגת האלמנטים בצורה שתיכנס יותרטוב. 


### Styling
- [ ] Color scheme: [Specify colors or "use existing theme"]
- [ ] Font requirements: [Specific fonts or "inherit from parent"]
- [ ] Border/Shadow requirements: [Describe visual style]
יש פלטת צבעים לעמוד. צריך להיצמד לצבעים הללו. באופן הכללי הנגן צריךל היות בעלי צבעים כהים יחסית, 
אבלצריך גם ליצור ניגודיות. הצבעים בעמוד הזה הם ירוק- טורקיז. בצד הזה של העמוד אני רוצה להתרכז יותר
בגווני הטורקיז יותר ולתת רק נגיעה של ירוק. 

### Positioning
- [ ] Where does player appear: [Fixed position? Part of page flow?]
- [ ] Height/Width constraints: [Min/max dimensions]
יש לו מקום קבוע בעמוד - קוניינר משלו. הוא צריך להיות מותאם לקונטיינר כל הזמן. 

### [Add more UI/UX requirements]

---

## 7. TECHNICAL CONSTRAINTS

### Browser Support
- [ ] Must work in: [List browsers]
- [ ] Can ignore: [List browsers we don't need to support]
רצוי שיעבוד בכמה שיותר דפדפנים. 
הדפדן המרכזי הוא גוגל כרום, אבל עדיפות לכולם - כולל גם לספארי. 

### Dependencies
- [ ] Can use jQuery: [Yes/No]
- [ ] Can use external libraries: [List any]
- [ ] Must be vanilla JS: [Yes/No]
אפשר להשתמש בכל השפות ובכל הספריות שתרצה. 
אני רוצה לעבור אפילו לשפת NODE.JS, אז מעכשיו תוכל לקחתאת זה בחשבון. 


### Performance
- [ ] Max file size: [Any limits?]
לא, המערכת צריכה לאפשר העלאת קבצים גדולים מאוד. 
- [ ] Animation requirements: [Smooth playback priority?]
בהחלט!

---

## 8. INTEGRATION REQUIREMENTS

### File Loading
- [ ] How files are provided: [URL? Blob? Local path?]
- [ ] File types to support: [mp3, mp4, wav, etc.]
יש תמיכה בכל סוגי הפורמטים. כרגע הקבצים מועלים באמצעות הממשק הראשי. 
תוכל לעיין בעמוד הראשי ולראות כיצד נטענים הפרויקטים. 

### API/Interface
- [ ] Global functions needed: [List any window.* functions needed]
- [ ] Events to emit: [Any custom events?]
- [ ] Methods to expose: [What should other code be able to call?]

### Existing Code Integration
- [ ] Must work with: [List existing components]
- [ ] Must not conflict with: [List potential conflicts]
פירטתי למעלה. 

---

## 9. TESTING CHECKLIST
Specific tests to run after each change:

### Basic Functionality Tests
- [ ] Click play → audio starts
- [ ] Click pause → audio stops  
- [ ] Click progress bar at 50% → seeks to middle
- [ ] Drag progress bar → audio follows
- [ ] [Add more specific tests]
אני רוצה לבדוק קודם את הפונקציונאליות של האודיו, כפי שהגדרתי אותה. 
אחר כך לבדוק את הווידאו
אחר כך לחבר את ההגדרות ששולטות על המדיה. 

### RTL Tests
- [ ] Progress bar fills in correct direction
- [ ] Buttons appear in correct order
- [ ] Clicking works correctly in RTL
- [ ] [Add more RTL tests]

### Edge Cases
- [ ] Load invalid file → shows error gracefully
- [ ] Click play with no file → handles gracefully
- [ ] [Add more edge cases]

---

## 10. KNOWN ISSUES TO AVOID
Problems encountered in previous attempts:

### Video Cube Issues
- Problem: [Describe what went wrong]
- Solution: [How to avoid it]
בהתחלה עבד מעולה. אחר כך כשחיברנו את חלון ההגדרות לשליטה על הנגן הווידאו הפסיק לעבוד 
בלחיצה על הקובייה הקובייה נעלמה. ואז ניסית לתקן וזה חזר על עצמו
והוספת עוד ועוד ועוד שורות קוד, במקום לאתר את הבעיה. 
בסופו של דבר גם הגדרות שכבר עבדו נכון הפסיקו לעבוד. 

### RTL Problems  
- Problem: [Describe what went wrong]
- Solution: [How to avoid it]
הכול עבד נכון. בניסיון לתקן ההגדרות האלה נהרסו. 

### [Add more known issues]

---

## 11. DEVELOPMENT STAGES
Build in this exact order - complete and test each stage before moving to next:

### Stage 1: Basic Audio Player
- [ ] HTML structure
- [ ] Play/Pause functionality
- [ ] Progress bar display
- [ ] Test completely before Stage 2

### Stage 2: RTL Support
- [ ] Apply RTL styling
- [ ] Fix button order
- [ ] Test all RTL behavior
- [ ] Verify Stage 1 still works

### Stage 3: Time and Controls
- [ ] Add time displays
- [ ] Add forward/rewind
- [ ] Test all controls
- [ ] Verify previous stages still work

### Stage 4: Advanced Features
- [ ] Add volume control
- [ ] Add speed control
- [ ] Test all features
- [ ] Verify previous stages still work

### Stage 5: Video Support (if needed)
- [ ] Add video display
- [ ] Test video sync
- [ ] Verify audio-only still works

### Stage 6: Integration
- [ ] Integrate with main application
- [ ] Test in real environment
- [ ] Final verification

---

## 12. ADDITIONAL NOTES
[Add any other important information, special cases, or context]

### Special Considerations:
[Free text area]

### References:
[Links to designs, examples, or documentation]

### Questions/Clarifications Needed:
[List any unclear requirements]

---

## VERSION HISTORY
- Created: [Today's date]
- Last Updated: [Update when modified]
- Version: 1.0

---

## SIGN-OFF
By filling this document, I confirm these are the complete requirements:
- Developer: Claude
- Product Owner: [Your name]
- Date: [Date]

---

**IMPORTANT FOR CLAUDE:** 
- Check this document before EVERY change
- Do NOT add features not listed here
- If unclear, ASK before implementing
- Mark items with [x] when completed
- If something seems missing, ASK before adding