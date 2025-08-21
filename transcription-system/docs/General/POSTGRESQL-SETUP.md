# PostgreSQL Setup Guide for Windows

## 📥 Installation Steps

### Option 1: Using PostgreSQL Installer (Recommended)

1. **Download PostgreSQL:**
   - Go to: https://www.postgresql.org/download/windows/
   - Download the installer (PostgreSQL 16 or 15)
   - Run the installer as Administrator

2. **Installation Settings:**
   - **Installation Directory:** Keep default (C:\Program Files\PostgreSQL\16)
   - **Data Directory:** Keep default 
   - **Password:** Set to `postgres` (matching our .env file)
   - **Port:** Keep `5432` (matching our .env file)
   - **Locale:** Default
   - ✅ Check "PostgreSQL Server" 
   - ✅ Check "pgAdmin 4" (optional but helpful)
   - ✅ Check "Command Line Tools"

3. **After Installation:**
   - PostgreSQL service should start automatically
   - If not, open Services (services.msc) and start "postgresql-x64-16"

### Option 2: Using Chocolatey (If you have it)

```powershell
# Run as Administrator
choco install postgresql
```

### Option 3: Using Docker (If you prefer)

```bash
# Run PostgreSQL in Docker
docker run --name postgres-transcription -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

## 🔧 Database Setup

### 1. Create the Database

Open Command Prompt or PowerShell and run:

```bash
# Connect to PostgreSQL
psql -U postgres

# Enter password: postgres

# Create database
CREATE DATABASE transcription_dev;

# Verify it was created
\l

# Exit
\q
```

### Alternative: Using pgAdmin (GUI)
1. Open pgAdmin 4
2. Connect to localhost server (password: postgres)
3. Right-click on "Databases" → Create → Database
4. Name: `transcription_dev`
5. Click Save

## 🌱 Seed the Database

Once PostgreSQL is running and database is created:

```bash
cd C:\Users\ayelh\Documents\Projects\Transcription\transcription-system\backend

# Seed the database with initial users
npm run seed
```

This will create:
- Admin user: `admin / admin123` (Full access - ABCDEF)
- User1: `user1 / pass123` (CRM + Transcription - ABD)
- Demo user: `demo / demo123` (Transcription only - D)

## ✅ Verification Checklist

### 1. Check PostgreSQL is Running

```bash
# Check if PostgreSQL is listening on port 5432
netstat -an | findstr :5432
```

Expected output:
```
TCP    0.0.0.0:5432    0.0.0.0:0    LISTENING
TCP    [::]:5432       [::]:0       LISTENING
```

### 2. Test Database Connection

```bash
psql -U postgres -d transcription_dev -c "SELECT NOW();"
```

### 3. Check Backend Health

```bash
curl http://localhost:5000/health
```

Should show:
```json
{
  "status": "OK",
  "database": "Connected",
  "environment": "development",
  "timestamp": "..."
}
```

### 4. Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

Should return a JWT token and user data.

## 🔍 Troubleshooting

### PostgreSQL Service Won't Start
1. Check Windows Services (services.msc)
2. Look for "postgresql-x64-XX" service
3. Right-click → Start
4. If fails, check Event Viewer for errors

### Connection Refused Error
1. Check if PostgreSQL is running
2. Verify port 5432 is not blocked by firewall
3. Check pg_hba.conf allows local connections
4. Location: `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`
5. Should have: `host all all 127.0.0.1/32 md5`

### Wrong Password Error
1. Update `.env.development` file with correct password
2. Or reset PostgreSQL password:
```sql
ALTER USER postgres PASSWORD 'postgres';
```

### Port Already in Use
If port 5432 is already used:
1. Change port in PostgreSQL configuration
2. Update `DB_PORT` in `.env.development`
3. Restart PostgreSQL service

## 📊 Database Management

### View All Tables
```sql
psql -U postgres -d transcription_dev

\dt  -- List all tables
\d users  -- Describe users table
\d licenses  -- Describe licenses table
\d sessions  -- Describe sessions table
```

### View Users
```sql
SELECT id, username, email, permissions FROM users;
```

### Reset Database (if needed)
```sql
DROP DATABASE transcription_dev;
CREATE DATABASE transcription_dev;
-- Then run: npm run seed
```

## 🚀 Ready to Go!

Once PostgreSQL is installed and running:

1. ✅ Backend will automatically connect
2. ✅ Tables will be created on first run
3. ✅ Seed script will add initial users
4. ✅ Authentication will work with database
5. ✅ You can login at http://localhost:3004/login

## 📝 Environment Variables

Your `.env.development` is already configured:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transcription_dev
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
```

Change these if your PostgreSQL setup differs.