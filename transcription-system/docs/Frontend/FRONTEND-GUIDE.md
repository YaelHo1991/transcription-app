# Frontend Development Guide - מדריך פיתוח צד לקוח

## 📋 תוכן עניינים
1. [מה זה Frontend?](#מה-זה-frontend)
2. [Next.js vs React רגיל](#nextjs-vs-react-רגיל)
3. [App Router vs Pages Router](#app-router-vs-pages-router)
4. [מבנה תיקיות מומלץ](#מבנה-תיקיות-מומלץ)
5. [מבנה עמודים לפי הדרישות שלך](#מבנה-עמודים-לפי-הדרישות-שלך)
6. [קבצי Root ותפקידם](#קבצי-root-ותפקידם)
7. [חוקי ארגון Frontend](#חוקי-ארגון-frontend)
8. [קומפוננטים לעומת עמודים](#קומפוננטים-לעומת-עמודים)
9. [ניהול State ו-Context](#ניהול-state-ו-context)
10. [סטיילינג ו-CSS](#סטיילינג-ו-css)
11. [DO's and DON'Ts](#dos-and-donts)

---

## מה זה Frontend?

ה-Frontend הוא **מה שהמשתמש רואה ומרגיש** - הממשק הגרפי של המערכת:
- 🎨 **עיצוב** - כל הווזואליים והצבעים
- 🖱️ **אינטראקציה** - לחיצות, טפסים, תפריטים
- 📱 **רספונסיביות** - מתאים לכל המסכים
- 🔄 **חווית משתמש** - זורם וקל לשימוש

**הלקוח לעולם לא עושה לוגיקה עסקית מורכבת או פונה ישירות למסד נתונים!**

---

## Next.js vs React רגיל

### מה זה Next.js?
Next.js הוא **React עם סופר-כוחות**:

```typescript
// React רגיל - צריך לעשות הכל בעצמך
function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/user').then(setUser).finally(() => setLoading(false))
  }, [])
  
  if (loading) return <div>Loading...</div>
  return <div>Hello {user?.name}</div>
}

// Next.js - עושה הרבה בשבילך
export default function UserPage({ user }: { user: User }) {
  return <div>Hello {user.name}</div>
}

// Next.js טוען את הנתונים בצד השרת!
export async function getServerSideProps() {
  const user = await fetch('/api/user')
  return { props: { user } }
}
```

### יתרונות של Next.js:
- ✅ **Routing אוטומטי** - קובץ = נתיב URL
- ✅ **SEO מעולה** - דפים נטענים בשרת
- ✅ **ביצועים** - קוד מתחלק אוטומטית
- ✅ **TypeScript** - תמיכה מובנית
- ✅ **API Routes** - יכול להכיל גם Backend

---

## App Router vs Pages Router

יש לנו **App Router** (החדש והמומלץ):

### App Router (מה שיש לנו):
```
src/app/
├── layout.tsx          ← Layout לכל האתר
├── page.tsx           ← העמוד הראשי (/)
├── login/
│   └── page.tsx       ← עמוד התחברות (/login)
├── crm/
│   ├── page.tsx       ← עמוד CRM (/crm)
│   ├── layout.tsx     ← Layout רק ל-CRM
│   └── clients/
│       └── page.tsx   ← רשימת לקוחות (/crm/clients)
```

### Pages Router (הישן):
```
src/pages/
├── index.tsx          ← העמוד הראשי
├── login.tsx          ← עמוד התחברות
├── crm/
│   ├── index.tsx      ← עמוד CRM
│   └── clients.tsx    ← רשימת לקוחות
```

### למה App Router יותר טוב?
1. **Layouts משותפים** - ניתן לשתף עיצוב בין עמודים
2. **Server Components** - רינדור בשרת = מהיר יותר
3. **Loading/Error Pages** - טיפול אוטומטי בטעינה ושגיאות
4. **קל יותר לארגן** - תיקייה = מקטע באתר

---

## מבנה תיקיות מומלץ

### מבנה כלליי:
```
frontend/main-app/
├── src/                    ← כל הקוד שלנו
│   ├── app/               ← עמודים (Next.js App Router)
│   ├── components/        ← קומפוננטים לשימוש חוזר
│   ├── lib/              ← פונקציות עזר
│   ├── context/          ← React Context (State גלובלי)
│   ├── types/            ← TypeScript types
│   ├── styles/           ← קבצי CSS
│   └── hooks/            ← Custom React hooks
│
├── public/               ← קבצים סטטיים (תמונות וכו')
├── package.json          ← רשימת ספריות
├── tsconfig.json         ← הגדרות TypeScript
├── tailwind.config.ts    ← הגדרות CSS
└── next.config.js        ← הגדרות Next.js
```

### קבצי Root ותפקידם:

#### 1. `package.json` - רשימת ספריות
```json
{
  "dependencies": {
    "react": "19.1.0",        ← React עצמו
    "next": "15.4.6",         ← Next.js
    "tailwindcss": "^4"       ← CSS framework
  },
  "scripts": {
    "dev": "next dev",        ← הרצה בפיתוח
    "build": "next build",    ← בניית גרסת ייצור
    "start": "next start"     ← הרצת גרסת ייצור
  }
}
```

#### 2. `tsconfig.json` - הגדרות TypeScript
```json
{
  "compilerOptions": {
    "lib": ["dom", "es6"],    ← תמיכה ב-DOM ו-ES6
    "allowJs": true,          ← מתיר גם JavaScript
    "strict": true,           ← בדיקות טיפוסים מחמירות
    "jsx": "preserve"         ← שימור JSX ל-Next.js
  }
}
```

#### 3. `next.config.js` - הגדרות Next.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // הגדרות מיוחדות לפרויקט
  experimental: {
    appDir: true  // הפעלת App Router
  },
  async redirects() {
    return [
      {
        source: '/old-url',
        destination: '/new-url',
        permanent: true
      }
    ]
  }
}
```

#### 4. `tailwind.config.ts` - הגדרות CSS
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],  // איפה לחפש classes
  theme: {
    extend: {
      colors: {
        primary: '#667eea',
        secondary: '#764ba2'
      }
    }
  }
}
```

---

## מבנה עמודים לפי הדרישות שלך

לפי מה שאמרת על המבנה הקיים שלך (5 תיקיות בתמלול), הנה המבנה המומלץ:

### מבנה מלא מומלץ:
```
src/app/
├── layout.tsx              ← Layout ראשי (ניווט, אותנטיקציה)
├── page.tsx               ← בחירת מערכת (licenses/crm/transcription)
├── globals.css            ← CSS גלובלי
├── login/
│   └── page.tsx           ← עמוד התחברות
│
├── licenses/              ← מערכת רישיונות (גישה חופשית)
│   ├── layout.tsx         ← Layout למערכת רישיונות
│   ├── page.tsx           ← דשבורד רישיונות
│   ├── purchase/
│   │   └── page.tsx       ← רכישת רישיון
│   ├── history/
│   │   └── page.tsx       ← היסטוריית רכישות
│   └── renew/
│       └── page.tsx       ← חידוש רישיון
│
├── crm/                   ← מערכת CRM (דורש הרשאות)
│   ├── layout.tsx         ← Layout למערכת CRM
│   ├── page.tsx           ← דשבורד CRM
│   │
│   ├── clients/           ← ניהול לקוחות (הרשאה A)
│   │   ├── page.tsx       ← רשימת לקוחות
│   │   ├── [id]/
│   │   │   └── page.tsx   ← פרטי לקוח ספציפי
│   │   └── new/
│   │       └── page.tsx   ← לקוח חדש
│   │
│   ├── jobs/              ← ניהול עבודות (הרשאה B)
│   │   ├── page.tsx       ← רשימת עבודות
│   │   ├── [id]/
│   │   │   └── page.tsx   ← פרטי עבודה
│   │   └── new/
│   │       └── page.tsx   ← עבודה חדשה
│   │
│   ├── transcribers/      ← ניהול מתמללים (הרשאה C)
│   │   ├── page.tsx       ← רשימת מתמללים
│   │   ├── [id]/
│   │   │   └── page.tsx   ← פרטי מתמלל
│   │   └── new/
│   │       └── page.tsx   ← מתמלל חדש
│   │
│   └── reports/           ← דוחות (נגיש לכל מי שיש לו CRM)
│       └── page.tsx       ← דשבורד דוחות
│
└── transcription/         ← מערכת תמלול (דורש הרשאות)
    ├── layout.tsx         ← Layout למערכת תמלול
    ├── page.tsx           ← דשבורד תמלול
    │
    ├── transcribe/        ← עבודת תמלול (הרשאה D)
    │   ├── page.tsx       ← רשימת עבודות תמלול
    │   └── [id]/
    │       └── page.tsx   ← ממשק תמלול
    │
    ├── proofread/         ← הגהה (הרשאה E)
    │   ├── page.tsx       ← רשימת עבודות הגהה
    │   └── [id]/
    │       └── page.tsx   ← ממשק הגהה
    │
    ├── export/            ← ייצוא (הרשאה F)
    │   ├── page.tsx       ← דשבורד ייצוא
    │   └── [id]/
    │       └── page.tsx   ← ייצוא עבודה ספציפית
    │
    └── reports/           ← דוחות (נגיש לכל מי שיש לו תמלול)
        └── page.tsx       ← דשבורד דוחות
```

### למה המבנה הזה טוב?
1. **כל מערכת = תיקייה** - CRM, Transcription נפרדים
2. **כל עמוד = תיקייה** - קל למצוא ולארגן
3. **[id] = עמוד דינמי** - יכול לקבל פרמטרים
4. **layout.tsx** - עיצוב משותף למערכת
5. **קל להרשאות** - כל תיקייה = הרשאה

---

## קומפוננטים לעומת עמודים

### מתי עושים קומפוננט?
**קומפוננט = משהו שחוזר על עצמו**

```typescript
// components/ui/Button.tsx - קומפוננט
interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded ${
        variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

```typescript
// app/crm/clients/page.tsx - עמוד שמשתמש בקומפוננט
import { Button } from '@/components/ui/Button'

export default function ClientsPage() {
  return (
    <div>
      <h1>לקוחות</h1>
      <Button onClick={() => alert('חדש!')}>לקוח חדש</Button>
      <Button variant="secondary" onClick={() => alert('ייצוא!')}>ייצוא</Button>
    </div>
  )
}
```

### מתי עושים עמוד?
**עמוד = URL יחיד במערכת**

### המבנה הממולץ לקומפוננטים:
```
components/
├── ui/                    ← קומפוננטים בסיסיים
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── Table.tsx
│
├── layout/                ← קומפוננטי פריסה
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Footer.tsx
│   └── Navigation.tsx
│
├── auth/                  ← קומפוננטי אותנטיקציה
│   ├── LoginForm.tsx
│   ├── ProtectedRoute.tsx
│   └── PermissionGate.tsx
│
└── systems/               ← קומפוננטים לכל מערכת
    ├── licenses/
    │   ├── LicenseCard.tsx
    │   └── PurchaseForm.tsx
    ├── crm/
    │   ├── ClientTable.tsx
    │   ├── JobCard.tsx
    │   └── TranscriberList.tsx
    └── transcription/
        ├── MediaPlayer.tsx
        ├── TextEditor.tsx
        └── ExportOptions.tsx
```

---

## ניהול State ו-Context

### מתי להשתמש בכל דרך?

#### 1. useState - למצב מקומי
```typescript
// בתוך קומפוננט אחד
export default function LoginForm() {
  const [email, setEmail] = useState('')  // רק בקומפוננט הזה
  const [loading, setLoading] = useState(false)
  
  return (
    <form>
      <input 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
      />
    </form>
  )
}
```

#### 2. Context - למצב גלובלי
```typescript
// context/AuthContext.tsx - מידע על המשתמש בכל האתר
interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  permissions: string  // "ABCDEF"
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  
  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    const userData = await response.json()
    setUser(userData)
  }
  
  return (
    <AuthContext.Provider value={{ user, login, logout, permissions: user?.permissions }}>
      {children}
    </AuthContext.Provider>
  )
}
```

```typescript
// lib/hooks/useAuth.ts - hook לשימוש ב-Context
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

```typescript
// app/crm/clients/page.tsx - שימוש ב-Context
import { useAuth } from '@/lib/hooks/useAuth'

export default function ClientsPage() {
  const { user, permissions } = useAuth()
  
  // בדיקה אם יש הרשאה לדף הזה
  if (!permissions.includes('A')) {
    return <div>אין לך הרשאה לדף זה</div>
  }
  
  return <div>ברוך הבא {user.name}!</div>
}
```

### מה שם ב-Context?
✅ **כדאי:**
- מידע על המשתמש (user, permissions)
- העדפות (theme, language)
- מצב האותנטיקציה (logged in/out)

❌ **לא כדאי:**
- נתוני טפסים
- מצבי טעינה זמניים
- נתונים ספציפיים לעמוד אחד

---

## סטיילינג ו-CSS

### יש לנו Tailwind CSS:

#### מה זה Tailwind?
במקום לכתוב CSS:
```css
.button {
  background-color: blue;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
}
```

כותבים classes ישירות ב-HTML:
```typescript
<button className="bg-blue-500 text-white px-4 py-2 rounded">
  לחץ כאן
</button>
```

#### יתרונות של Tailwind:
- ✅ מהיר לכתוב
- ✅ קשה לשבור משהו
- ✅ responsive אוטומטי
- ✅ גודל קבצי CSS קטן

#### דוגמה לקומפוננט מעוצב:
```typescript
// components/ui/Button.tsx
interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export function Button({ children, variant = 'primary', size = 'md', onClick }: ButtonProps) {
  const baseClasses = "font-medium rounded-md transition-colors focus:outline-none"
  
  const variantClasses = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    danger: "bg-red-500 hover:bg-red-600 text-white"
  }
  
  const sizeClasses = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  }
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

### ארגון CSS:
```
src/styles/
├── globals.css           ← CSS גלובלי (טעינה בlayout.tsx)
├── components.css        ← styles לקומפוננטים
└── rtl.css              ← תמיכה בעברית וערבית
```

---

## חוקי ארגון Frontend

### ✅ חוק 1: קובץ אחד = מחלקה אחת
```typescript
// ❌ רע - הכל בקובץ אחד
export function Button() { /* ... */ }
export function Input() { /* ... */ }
export function Modal() { /* ... */ }

// ✅ טוב - כל קומפוננט בקובץ נפרד
// components/ui/Button.tsx
export function Button() { /* ... */ }
```

### ✅ חוק 2: שמות קבצים ברורים
```
❌ רע:
components/comp1.tsx
components/thing.tsx
components/stuff.tsx

✅ טוב:
components/ui/Button.tsx
components/ui/Input.tsx
components/layout/Header.tsx
```

### ✅ חוק 3: הפרדת logic מ-UI
```typescript
// ❌ רע - הכל בקומפוננט
export default function ClientsPage() {
  const [clients, setClients] = useState([])
  
  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => setClients(data))
  }, [])
  
  return <div>{/* render clients */}</div>
}

// ✅ טוב - logic נפרד
// lib/api/clients.ts
export async function getClients() {
  const response = await fetch('/api/clients')
  return response.json()
}

// app/crm/clients/page.tsx
export default function ClientsPage() {
  const [clients, setClients] = useState([])
  
  useEffect(() => {
    getClients().then(setClients)
  }, [])
  
  return <div>{/* render clients */}</div>
}
```

### ✅ חוק 4: טיפוסים מרוכזים
```typescript
// types/api.ts - כל הטיפוסים במקום אחד
export interface User {
  id: string
  name: string
  permissions: string
}

export interface Client {
  id: string
  name: string
  email: string
}

// שימוש בטיפוסים
import { User, Client } from '@/types/api'
```

---

## DO's and DON'Ts

### ✅ DO - מה כן לעשות

1. **תמיד TypeScript עם interfaces**
```typescript
interface Props {
  title: string
  onClick: () => void
}

export function MyComponent({ title, onClick }: Props) {
  return <button onClick={onClick}>{title}</button>
}
```

2. **קומפוננטים קטנים וממוקדים**
```typescript
// ✅ טוב - קומפוננט אחד עושה דבר אחד
export function UserAvatar({ user }: { user: User }) {
  return (
    <img 
      src={user.avatar} 
      alt={user.name}
      className="w-8 h-8 rounded-full" 
    />
  )
}
```

3. **שימוש ב-Custom Hooks לlogic מורכב**
```typescript
// lib/hooks/useClients.ts
export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    getClients()
      .then(setClients)
      .finally(() => setLoading(false))
  }, [])
  
  return { clients, loading }
}

// שימוש בעמוד
export default function ClientsPage() {
  const { clients, loading } = useClients()
  
  if (loading) return <div>טוען...</div>
  return <div>{/* render clients */}</div>
}
```

### ❌ DON'T - מה לא לעשות

1. **לא לשים logic עסקית בקומפוננטים**
```typescript
// ❌ רע
export function PurchaseButton({ licenseId }: { licenseId: string }) {
  const handlePurchase = async () => {
    // חישוב מחיר
    const price = calculatePrice(licenseId)
    // עיבוד תשלום
    const payment = await processPayment(price)
    // שליחת מייל
    await sendEmail(payment)
  }
  
  return <button onClick={handlePurchase}>רכישה</button>
}

// ✅ טוב
export function PurchaseButton({ onPurchase }: { onPurchase: () => void }) {
  return <button onClick={onPurchase}>רכישה</button>
}
```

2. **לא לשכוח error handling**
```typescript
// ❌ רע
const data = await fetch('/api/data')
setData(data.json())

// ✅ טוב
try {
  const response = await fetch('/api/data')
  if (!response.ok) throw new Error('Failed to fetch')
  const data = await response.json()
  setData(data)
} catch (error) {
  setError(error.message)
}
```

3. **לא לשכוח loading states**
```typescript
// ❌ רע
export default function UsersPage() {
  const [users, setUsers] = useState([])
  
  useEffect(() => {
    getUsers().then(setUsers)
  }, [])
  
  return <div>{users.map(user => <div key={user.id}>{user.name}</div>)}</div>
}

// ✅ טוב
export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])
  
  if (loading) return <div>טוען...</div>
  if (error) return <div>שגיאה: {error}</div>
  
  return <div>{users.map(user => <div key={user.id}>{user.name}</div>)}</div>
}
```

---

## ההבדלים החשובים מ-Backend

### Frontend ≠ Backend

| Frontend | Backend |
|----------|---------|
| 🎨 מה שרואים | 🧠 לוגיקה עסקית |
| 🖱️ אינטראקציות | 💾 מסד נתונים |
| 📱 responsive | 🔐 אבטחה |
| ⚡ מהיר לטעינה | 📧 שירותים חיצוניים |

### מה לא עושים ב-Frontend:
- ❌ חישובים עסקיים מורכבים
- ❌ שמירת סיסמאות
- ❌ עיבוד תשלומים
- ❌ שליחת מיילים
- ❌ פעולות על מסד נתונים

### מה כן עושים:
- ✅ הצגת נתונים יפה
- ✅ ולידציה בסיסית (required fields)
- ✅ ניווט בין עמודים
- ✅ חווית משתמש חלקה

---

## טיפים לעבודה יעילה

1. **התחל מהקומפוננטים הכי בסיסיים** - Button, Input, Modal
2. **בנה עמוד אחד במלואו** לפני המעבר לבא
3. **בדוק responsive** על מסכים שונים
4. **השתמש בכלי הדפדפן** לדיבאג
5. **תתקן TypeScript errors** מיד

---

## סיכום

ה-Frontend הוא הפנים של המערכת. הוא:
- ✅ מציג מידע בצורה יפה וברורה
- ✅ מספק חווית משתמש חלקה
- ✅ מותאם לכל המכשירים
- ✅ מתחבר ל-Backend בצורה נקייה

**זכור:** הלקוח רק מציג - כל הלוגיקה החשובה ב-Backend!

---

*מסמך זה נועד לשמור על סדר וארגון בפיתוח Frontend. יש לעדכן אותו כשמוסיפים מבנים חדשים.*