# Backend Development Guide - מדריך פיתוח צד שרת

## 📋 תוכן עניינים
1. [מה זה Backend?](#מה-זה-backend)
2. [קבצי Root - הסבר מלא](#קבצי-root---הסבר-מלא)
3. [מבנה התיקיות](#מבנה-התיקיות)
4. [תיקיית Dev-Tools](#תיקיית-dev-tools)
5. [מה כותבים והיכן](#מה-כותבים-והיכן)
6. [חוקי ארגון](#חוקי-ארגון-שחובה-לשמור)
7. [דוגמאות קוד](#דוגמאות-קוד)
8. [מה לעשות ומה לא](#dos-and-donts)

---

## מה זה Backend?

ה-Backend הוא **המוח של המערכת** - כאן קורים כל הדברים החשובים:
- 🔐 **אבטחה** - בדיקת סיסמאות והרשאות
- 💾 **מסד נתונים** - שמירה וקריאת מידע
- 📧 **שירותים** - שליחת מיילים, עיבוד תשלומים
- ✅ **ולידציה** - בדיקה שהמידע תקין

**הלקוח (Frontend) לעולם לא ניגש ישירות למסד נתונים!**

---

## קבצי Root - הסבר מלא

### קבצים קיימים בתיקיית backend:

#### 1. `.env.development` - קובץ הגדרות
```env
PORT=5000              ← איזה פורט להשתמש
JWT_SECRET=abc123      ← מפתח הצפנה לסיסמאות
DATABASE_URL=...       ← חיבור למסד נתונים
ENABLE_DEV_TOOLS=true  ← הפעלת כלי פיתוח
```
**מטרה:** שמירת הגדרות שמשתנות בין פיתוח לייצור  
**מתי משתנה:** כשמוסיפים שירותים חדשים (מייל, תשלומים וכו')

#### 2. `tsconfig.json` - הגדרות TypeScript
```json
{
  "compilerOptions": {
    "target": "ES2020",    ← גרסת JavaScript
    "strict": true,        ← בדיקות טיפוסים מחמירות
    "outDir": "./dist"     ← איפה הקבצים המקומפלים
  }
}
```
**מטרה:** להגיד ל-TypeScript איך להמיר לJavaScript  
**מתי משתנה:** כמעט אף פעם (רק אם צריך פיצ'רים מיוחדים)

#### 3. `package.json` - רשימת ספריות
```json
{
  "dependencies": {
    "express": "^5.0.0",   ← שרת אינטרנט
    "mongodb": "^4.0.0"    ← חיבור למסד נתונים
  },
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc"
  }
}
```
**מטרה:** רשימה של כל הספריות שהפרויקט צריך  
**מתי משתנה:** כל פעם שמתקינים ספרייה חדשה

#### 4. `package-lock.json` - נעילת גרסאות
**מטרה:** שומר גרסאות מדויקות של ספריות  
**מתי משתנה:** אוטומטית כשמתקינים ספריות  
**חשוב:** לא לערוך ידנית!

#### 5. `BACKEND-GUIDE.md` - המדריך הזה
**מטרה:** הסברים על המבנה והארגון  
**מתי משתנה:** כשמוסיפים מבנים חדשים

### קבצים שיתכן ויתווספו בעתיד:

#### `.env.production` - הגדרות ייצור
```env
PORT=80
JWT_SECRET=real-secret-key
DATABASE_URL=real-database
ENABLE_DEV_TOOLS=false  ← כלי פיתוח כבויים!
```
**מתי יתווסף:** כשתעלו לייצור

#### `.env.test` - הגדרות בדיקות
**מתי יתווסף:** אם תוסיפו בדיקות אוטומטיות

#### `Dockerfile` - הגדרות Docker
**מתי יתווסף:** אם תשתמשו בקונטיינרים

#### `.gitignore` - מה לא להעלות לGit
```
node_modules/
.env*
dist/
```
**מתי יתווסף:** כשתשתמשו בGit (מומלץ!)

### מבנה מלא של תיקיית Root:

```
backend/
├── node_modules/        ← נוצר אוטומטית (לא נוגעים!)
├── dist/               ← קוד מקומפל (נוצר אוטומטית)
├── src/                ← הקוד שלכם
│   ├── server.ts       ← קובץ ראשי
│   ├── api/           ← הנתיבים שלכם
│   ├── dev-tools/     ← כלי פיתוח
│   └── ...            
│
├── package.json        ← רשימת ספריות
├── package-lock.json   ← גרסאות מדויקות (אוטומטי)
├── tsconfig.json       ← הגדרות TypeScript
├── .env.development    ← הגדרות פיתוח
├── .env.production     ← (עתידי) הגדרות ייצור
├── .gitignore         ← (עתידי) רשימת התעלמות Git
├── Dockerfile         ← (עתידי) הגדרות Docker
└── BACKEND-GUIDE.md   ← המדריך הזה
```

### חוקים לשמירת Root נקי:

✅ **מה כן בRoot:**
- קבצי הגדרות (config files)
- קבצי תיעוד (README, GUIDE)
- תיקיות שנוצרות אוטומטית (node_modules, dist)

❌ **מה לא בRoot:**
- קבצי קוד (.js, .ts) - הם הולכים לsrc/
- קבצי בדיקה זמניים
- קבצי נתונים
- כל קובץ שאין לו מטרה ברורה

**כלל פשוט:** אם זה לא הגדרות, תיעוד או אוטומטי - זה לא בRoot!

---

## מבנה התיקיות

### מבנה נוכחי:
```
backend/
├── node_modules/     ← ספריות (לא נוגעים!)
├── src/              ← הקוד שלך (כאן עובדים!)
├── package.json      ← רשימת ספריות
└── tsconfig.json     ← הגדרות TypeScript
```

### מבנה מומלץ ל-src:
```
src/
├── server.ts                    ← קובץ ראשי (לא לסבך!)
│
├── api/                         ← תואם למבנה הלקוח
│   ├── licenses/               
│   │   ├── routes.ts           ← נתיבי URL
│   │   ├── controller.ts       ← לוגיקה עסקית
│   │   ├── validation.ts       ← בדיקת נתונים
│   │   └── types.ts            ← TypeScript types
│   │
│   ├── crm/
│   │   └── [אותו מבנה]
│   │
│   ├── transcription/
│   │   └── [אותו מבנה]
│   │
│   └── auth/
│       ├── routes.ts           ← login/logout
│       ├── controller.ts       ← בדיקת סיסמאות
│       └── middleware.ts       ← בדיקה אם מחובר
│
├── database/                    ← כל הקשור למסד נתונים
│   ├── connection.ts           ← חיבור למסד
│   ├── models/                 ← מבני נתונים
│   └── queries/                ← פעולות על המסד
│
├── services/                    ← שירותים משותפים
│   ├── email.service.ts       
│   ├── payment.service.ts     
│   └── file.service.ts        
│
├── utils/                       ← פונקציות עזר
│   ├── logger.ts               
│   ├── errors.ts               
│   └── constants.ts            
│
├── middleware/                  ← רץ לפני הנתיבים
│   └── auth.middleware.ts      
│
└── dev-tools/                   ← כלי פיתוח בלבד
```

---

## תיקיית Dev-Tools

### מה נכנס לתיקיית `dev-tools/`?

**כן! כל כלי הפיתוח והבדיקות נכנסים לכאן:**

```
dev-tools/
├── routes.ts         ← לוח הבקרה לפיתוח (מה שרואים ב-localhost:5000/dev)
├── mock-data.ts      ← נתונים מזויפים לבדיקות
├── seeders.ts        ← (עתידי) מילוי מסד נתונים בנתוני בדיקה
├── test-api.ts       ← (עתידי) בדיקת כל הנתיבים שלכם
├── backup-tools.ts   ← (עתידי) מערכת גיבויים לקוד
├── migration.ts      ← (עתידי) עדכוני מסד נתונים
└── sandbox.ts        ← (עתידי) אזור ניסויים לקוד
```

### חשוב לדעת על dev-tools:

🔒 **אבטחה:**
- פועל **רק במצב פיתוח** (NODE_ENV=development)
- **אף פעם לא זמין למשתמשים אמיתיים**
- **אסור לחשוף סיסמאות בייצור**

🛠️ **מטרה:**
- כלי ניהול למפתחים
- בדיקות ללא צורך בלקוח
- צפייה בנתונים ובמצב המערכת
- כלי דיבאג ופתרון בעיות

📝 **דוגמאות למה שאפשר להוסיף:**
```typescript
// dev-tools/seeders.ts - מילוי נתוני בדיקה
export async function seedDatabase() {
  await createTestUsers(100)
  await createTestLicenses(50)
  await createTestJobs(200)
}

// dev-tools/test-api.ts - בדיקת נתיבים
export async function testAllEndpoints() {
  const results = []
  results.push(await testEndpoint('GET', '/api/licenses'))
  results.push(await testEndpoint('POST', '/api/auth/login'))
  return results
}

// dev-tools/backup-tools.ts - גיבוי קוד
export async function backupCurrentVersion() {
  const version = `backup-${Date.now()}`
  await copyToBackupFolder(version)
}
```

### מתי משתמשים ב-dev-tools:

✅ **כשרוצים:**
- לראות את כל המשתמשים והסיסמאות
- לבדוק נתיבי API בלי לקוח
- למלא מסד נתונים בנתונים מזויפים
- לנקות/לאפס את מסד הנתונים
- לגבות גרסאות של קוד

❌ **לא משתמשים ל:**
- קוד ייצור אמיתי
- לוגיקה עסקית
- נתיבי API למשתמשים

**כלל זהב:** אם זה לא צריך להיות בייצור - זה הולך ל-dev-tools!

---

## server.ts - הקובץ הראשי

### מה זה server.ts?

זה **נקודת ההתחלה** של כל השרת. כמו main() בשפות אחרות.

```typescript
// server.ts - מבנה בסיסי
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// טעינת הגדרות
dotenv.config()

// יצירת השרת
const app = express()

// הגדרות בסיסיות
app.use(cors())
app.use(express.json())

// חיבור נתיבים
import apiRoutes from './api/routes'
import devTools from './dev-tools/routes'

app.use('/api', apiRoutes)

// כלי פיתוח - רק בפיתוח!
if (process.env.NODE_ENV === 'development') {
  app.use('/dev', devTools)
}

// הפעלת השרת
app.listen(5000, () => {
  console.log('Server running on port 5000')
})
```

### מה כותבים בserver.ts:

✅ **כן:**
- הגדרות כלליות (CORS, JSON parsing)
- חיבור נתיבים ראשיים
- חיבור למסד נתונים
- טיפול בשגיאות כללי
- הפעלת השרת

❌ **לא:**
- לוגיקה עסקית
- נתיבים ספציפיים
- קוד ארוך ומסובך

**כלל:** server.ts צריך להישאר נקי וקצר - רק מחבר את החלקים!

---

## מה כותבים והיכן

### 📍 Routes (נתיבים) - `routes.ts`
**מה זה:** הכתובות שהלקוח פונה אליהן
```typescript
// api/licenses/routes.ts
router.get('/licenses', getAllLicenses)      // רשימת כל הרישיונות
router.get('/licenses/:id', getLicenseById)  // רישיון ספציפי
router.post('/licenses', createLicense)      // יצירת רישיון חדש
router.put('/licenses/:id', updateLicense)   // עדכון רישיון
router.delete('/licenses/:id', deleteLicense) // מחיקת רישיון
```

### 🎯 Controllers (בקרים) - `controller.ts`
**מה זה:** הלוגיקה העסקית - מה קורה כשמישהו פונה לנתיב
```typescript
// api/licenses/controller.ts
export async function createLicense(req: Request, res: Response) {
  try {
    // 1. בדיקת נתונים
    const validData = validateLicenseData(req.body)
    
    // 2. שמירה במסד נתונים
    const license = await saveLicenseToDb(validData)
    
    // 3. שליחת מייל
    await sendLicenseEmail(license)
    
    // 4. החזרת תשובה
    res.json({ success: true, license })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}
```

### ✅ Validation (ולידציה) - `validation.ts`
**מה זה:** בדיקה שהנתונים תקינים
```typescript
// api/licenses/validation.ts
export function validateLicenseData(data: any) {
  if (!data.email) throw new Error('Email is required')
  if (!data.licenseType) throw new Error('License type is required')
  
  return {
    email: data.email.toLowerCase().trim(),
    licenseType: data.licenseType,
    createdAt: new Date()
  }
}
```

### 💾 Database Queries - `queries/*.ts`
**מה זה:** פעולות על מסד הנתונים
```typescript
// database/queries/licenses.queries.ts
export async function saveLicenseToDb(data: LicenseData) {
  const result = await db.collection('licenses').insertOne(data)
  return result
}

export async function getAllLicenses(userId: string) {
  return await db.collection('licenses').find({ userId }).toArray()
}
```

### 📧 Services (שירותים) - `services/*.ts`
**מה זה:** פעולות משותפות כמו שליחת מייל
```typescript
// services/email.service.ts
export async function sendLicenseEmail(license: License) {
  const mailOptions = {
    to: license.email,
    subject: 'הרישיון שלך מוכן!',
    html: `<h1>רישיון מספר: ${license.code}</h1>`
  }
  
  await mailTransporter.send(mailOptions)
}
```

---

## חוקי ארגון שחובה לשמור

### ✅ חוק 1: תיקייה לכל מערכת
```
api/
├── licenses/     ← כל מה שקשור לרישיונות
├── crm/          ← כל מה שקשור ל-CRM
└── transcription/ ← כל מה שקשור לתמלול
```

### ✅ חוק 2: שמות קבצים אחידים
```
*.routes.ts      ← נתיבים
*.controller.ts  ← לוגיקה
*.validation.ts  ← בדיקות
*.service.ts     ← שירותים
*.queries.ts     ← מסד נתונים
*.types.ts       ← TypeScript types
```

### ✅ חוק 3: הפרדת אחריות
- **Routes:** רק מגדיר URLs
- **Controller:** רק לוגיקה עסקית
- **Database:** רק פעולות מסד נתונים
- **Services:** רק שירותים חיצוניים

### ✅ חוק 4: מסד נתונים בתיקייה נפרדת
```typescript
// ❌ רע - SQL בתוך controller
async function getUser(req, res) {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id])
}

// ✅ טוב - SQL בקובץ נפרד
async function getUser(req, res) {
  const user = await getUserById(req.params.id) // קריאה לפונקציה מ-queries
}
```

---

## דוגמאות קוד

### דוגמה מלאה: מערכת רישיונות

#### 1. Routes - `api/licenses/routes.ts`
```typescript
import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import * as controller from './controller'

const router = Router()

// Public routes
router.post('/purchase', controller.purchaseLicense)

// Protected routes (need login)
router.use(authMiddleware)
router.get('/', controller.getUserLicenses)
router.get('/:id', controller.getLicenseDetails)
router.put('/:id/renew', controller.renewLicense)

export default router
```

#### 2. Controller - `api/licenses/controller.ts`
```typescript
import { Request, Response } from 'express'
import { validatePurchaseData } from './validation'
import { createLicense, getUserLicenses as getFromDb } from '../../database/queries/licenses.queries'
import { sendLicenseEmail } from '../../services/email.service'
import { processPayment } from '../../services/payment.service'

export async function purchaseLicense(req: Request, res: Response) {
  try {
    // 1. Validate
    const data = validatePurchaseData(req.body)
    
    // 2. Process payment
    const payment = await processPayment(data.paymentInfo)
    
    // 3. Create license
    const license = await createLicense({
      ...data,
      paymentId: payment.id
    })
    
    // 4. Send email
    await sendLicenseEmail(license)
    
    // 5. Response
    res.json({ 
      success: true, 
      licenseCode: license.code 
    })
    
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    })
  }
}

export async function getUserLicenses(req: Request, res: Response) {
  const userId = req.user.id // From auth middleware
  const licenses = await getFromDb(userId)
  res.json(licenses)
}
```

---

## DO's and DON'Ts

### ✅ DO - מה כן לעשות

1. **תמיד תיקייה נפרדת לכל פיצ'ר**
   ```
   api/licenses/
   api/crm/
   api/transcription/
   ```

2. **תמיד validation לפני שמירה**
   ```typescript
   const validData = validateData(req.body)
   await saveToDatabase(validData)
   ```

3. **תמיד try/catch בcontrollers**
   ```typescript
   try {
     // your code
   } catch (error) {
     res.status(400).json({ error: error.message })
   }
   ```

4. **תמיד TypeScript types**
   ```typescript
   interface License {
     id: string
     code: string
     userId: string
     expiresAt: Date
   }
   ```

### ❌ DON'T - מה לא לעשות

1. **לא לערבב מסד נתונים בcontrollers**
   ```typescript
   // ❌ רע
   const user = await db.query('SELECT * FROM users')
   
   // ✅ טוב
   const user = await getUserFromDatabase()
   ```

2. **לא לשים לוגיקה בroutes**
   ```typescript
   // ❌ רע
   router.get('/users', async (req, res) => {
     const users = await db.find()
     res.json(users)
   })
   
   // ✅ טוב
   router.get('/users', getUsersController)
   ```

3. **לא להחזיר סיסמאות ללקוח**
   ```typescript
   // ❌ רע
   res.json({ user: { password: 'abc123' } })
   
   // ✅ טוב
   res.json({ user: { id, email, name } })
   ```

4. **לא לשכוח אבטחה**
   ```typescript
   // ❌ רע
   router.delete('/users/:id', deleteUser)
   
   // ✅ טוב
   router.delete('/users/:id', authMiddleware, checkAdmin, deleteUser)
   ```

---

## הוראות לשמירה על סדר

### בכל פעם שמוסיפים פיצ'ר חדש:

1. **צור תיקייה חדשה ב-api/**
   ```
   api/new-feature/
   ```

2. **צור את הקבצים הבסיסיים:**
   - `routes.ts` - נתיבים
   - `controller.ts` - לוגיקה
   - `validation.ts` - בדיקות
   - `types.ts` - TypeScript

3. **הוסף queries אם צריך:**
   ```
   database/queries/new-feature.queries.ts
   ```

4. **חבר ל-server.ts:**
   ```typescript
   app.use('/api/new-feature', newFeatureRoutes)
   ```

### בכל commit:
- [ ] כל הקבצים במקום הנכון?
- [ ] יש validation לכל endpoint?
- [ ] יש try/catch בכל controller?
- [ ] אין סיסמאות או מידע רגיש בתגובות?

---

## טיפים לניהול נכון

1. **קובץ אחד - תפקיד אחד**
2. **תיקייה אחת - מערכת אחת**
3. **שמות ברורים ואחידים**
4. **תיעוד בקוד (comments)**
5. **בדיקות לפני שמירה במסד נתונים**

---

## סיכום

ה-Backend הוא המוח של המערכת. הוא:
- ✅ מטפל בלוגיקה העסקית
- ✅ מדבר עם מסד הנתונים
- ✅ מוודא אבטחה
- ✅ מספק API ללקוח

**זכור:** הלקוח (Frontend) רק מציג - כל הלוגיקה החשובה כאן!

---

*מסמך זה נועד לשמור על סדר וארגון בפיתוח. יש לעדכן אותו כשמוסיפים מבנים חדשים.*