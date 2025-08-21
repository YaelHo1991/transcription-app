# Database Security Implementation Guide

## 🔒 Network Security Measures Implemented

### 1. **Rate Limiting**
- **Login attempts**: Max 5 attempts per 15 minutes per IP
- **API calls**: Max 100 requests per 15 minutes per IP  
- **Sensitive operations**: Max 10 requests per hour per IP
- Prevents brute force attacks and API abuse

### 2. **Security Headers (Helmet.js)**
- **Content Security Policy**: Restricts resource loading
- **HSTS**: Forces HTTPS in production
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Additional XSS protection
- **Referrer Policy**: Controls referrer information

### 3. **Input Validation & Sanitization**
- **MongoDB Injection Protection**: Sanitizes all inputs
- **SQL Injection Protection**: Pattern matching for SQL keywords
- **XSS Protection**: Sanitizes HTML/JavaScript in inputs
- **Size Limits**: NO LIMITS (supports extremely large transcription files)
- **Type Validation**: Ensures correct data types

### 4. **CORS Protection**
- Restricted origins (only your frontend)
- Credentials support with specific headers
- Preflight caching for performance

### 5. **Authentication Security**
- **JWT Tokens**: Strong secret keys
- **Bcrypt Hashing**: Passwords properly hashed
- **Session Management**: Secure token storage
- **Authorization Headers**: Protected API routes

## 🗄️ Database Security Best Practices (For Stage 6)

### When Setting Up Database:

#### **PostgreSQL Security**
```javascript
// Use parameterized queries ALWAYS
const query = 'SELECT * FROM users WHERE username = $1 AND password = $2';
const values = [username, hashedPassword];
await db.query(query, values);

// NEVER do this:
// const query = `SELECT * FROM users WHERE username = '${username}'`; // SQL INJECTION RISK!
```

#### **MongoDB Security**
```javascript
// Use MongoDB operators safely
const user = await User.findOne({ 
  username: sanitizedUsername,
  // MongoDB injection already protected by express-mongo-sanitize
});

// Use schema validation
const userSchema = new Schema({
  username: { 
    type: String, 
    required: true,
    maxLength: 50,
    match: /^[a-zA-Z0-9_]+$/ // Only alphanumeric and underscore
  }
});
```

### Database Connection Security

#### **Environment Variables**
```env
# Production database credentials (NEVER commit these!)
DB_HOST=your-secure-host
DB_PORT=5432
DB_NAME=production_db
DB_USER=prod_user
DB_PASSWORD=strong_password_here
DB_SSL=true
DB_MAX_CONNECTIONS=20
```

#### **Connection Pool Settings**
```javascript
const poolConfig = {
  max: 20, // Maximum connections
  min: 2,  // Minimum connections
  idleTimeoutMillis: 30000, // Close idle connections
  connectionTimeoutMillis: 2000, // Connection timeout
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: fs.readFileSync('path/to/ca-cert.pem')
  } : false
};
```

### Database User Permissions

#### **Principle of Least Privilege**
```sql
-- Create application user with limited permissions
CREATE USER app_user WITH PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
GRANT SELECT, INSERT ON sessions TO app_user;
GRANT SELECT ON licenses TO app_user;

-- Never grant these to application user:
-- GRANT ALL PRIVILEGES
-- GRANT DROP, CREATE, ALTER
-- GRANT SUPER or ADMIN roles
```

### Query Security Checklist

#### ✅ **Always Use**:
1. Parameterized queries/prepared statements
2. Input validation before database operations
3. Schema validation (Mongoose/TypeORM)
4. Transaction rollback on errors
5. Query timeouts to prevent long-running queries

#### ❌ **Never Do**:
1. String concatenation for queries
2. Direct user input in queries
3. Store passwords in plain text
4. Log sensitive query data
5. Use admin credentials for app connections

### Data Encryption

#### **At Rest**
```javascript
// Encrypt sensitive fields
const crypto = require('crypto');
const algorithm = 'aes-256-gcm';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  // ... encryption logic
}

// Store encrypted data
user.creditCard = encrypt(creditCardNumber);
```

#### **In Transit**
- Always use SSL/TLS for database connections
- Use SSH tunnels for remote connections
- Implement VPN for production access

### Audit & Monitoring

#### **Query Logging**
```javascript
// Log suspicious queries
app.use((req, res, next) => {
  if (isSuspiciousQuery(req)) {
    logger.warn('Suspicious query attempt', {
      ip: req.ip,
      query: sanitizeForLogging(req.body),
      timestamp: new Date()
    });
  }
  next();
});
```

#### **Failed Authentication Tracking**
```javascript
// Track failed login attempts
const failedAttempts = new Map();

function trackFailedLogin(username, ip) {
  const key = `${username}:${ip}`;
  const attempts = failedAttempts.get(key) || 0;
  failedAttempts.set(key, attempts + 1);
  
  if (attempts > 5) {
    // Alert security team
    sendSecurityAlert({
      type: 'BRUTE_FORCE_ATTEMPT',
      username,
      ip,
      attempts
    });
  }
}
```

### Backup Security

#### **Encrypted Backups**
```bash
# Encrypt database backups
pg_dump dbname | openssl enc -aes-256-cbc -k SECRET > backup.sql.enc

# Decrypt when needed
openssl enc -d -aes-256-cbc -k SECRET -in backup.sql.enc | psql dbname
```

#### **Backup Access Control**
- Store backups in separate, secure location
- Limit access to backup files
- Rotate old backups regularly
- Test restore procedures

## 🚨 Security Response Plan

### If Breach Detected:
1. **Immediate Actions**:
   - Revoke all database credentials
   - Block suspicious IPs
   - Enable read-only mode
   - Preserve logs for investigation

2. **Investigation**:
   - Review access logs
   - Check for data exfiltration
   - Identify attack vector
   - Document timeline

3. **Recovery**:
   - Reset all passwords
   - Patch vulnerabilities
   - Restore from clean backup if needed
   - Implement additional monitoring

## 📋 Security Testing Checklist

- [ ] Test rate limiting with multiple requests
- [ ] Verify SQL injection protection
- [ ] Check MongoDB injection protection
- [ ] Test XSS prevention
- [ ] Verify CSRF token validation
- [ ] Test authentication flow
- [ ] Check authorization on all endpoints
- [ ] Verify SSL/TLS configuration
- [ ] Test backup and restore procedures
- [ ] Run security scanner (OWASP ZAP)

## 🔍 Monitoring Commands

```bash
# Check active connections
SELECT COUNT(*) FROM pg_stat_activity;

# View slow queries
SELECT query, calls, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

# Check for lock issues
SELECT * FROM pg_locks WHERE granted = false;

# Monitor failed login attempts
tail -f /var/log/postgresql/postgresql.log | grep "authentication failed"
```

## 📚 Additional Resources

- [OWASP SQL Injection Prevention](https://owasp.org/www-community/attacks/SQL_Injection)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Remember**: Security is not a one-time setup but an ongoing process. Regular audits, updates, and monitoring are essential for maintaining a secure system.