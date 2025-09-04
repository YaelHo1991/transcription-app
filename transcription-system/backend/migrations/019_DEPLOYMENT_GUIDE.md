# Migration 019: Auto-Correct Settings Deployment Guide

## Overview
This migration adds auto-correct functionality settings to the users table, allowing fine-grained control over transcription editing behavior.

## Changes Made
- **Table**: `users`
- **New Column**: `autocorrect_settings` (JSONB)
- **Index**: GIN index on `autocorrect_settings` for performance
- **Default Values**: All settings default to sensible values

## Auto-Correct Settings Structure
```json
{
  "blockDuplicateSpeakers": "disabled",
  "requirePunctuation": "disabled", 
  "preventDoubleSpace": "notify",
  "fixSpaceBeforePunctuation": "notify",
  "validateParentheses": "notify",
  "validateQuotes": "notify",
  "autoCapitalize": "notify",
  "fixNumberFormatting": "notify",
  "validEndingPunctuation": {
    ".": true, "!": true, "?": true, ":": true, ";": true, ",": false
  },
  "punctuationForSpaceFix": {
    ".": true, ",": true, ";": true, ":": true, "!": true, "?": true,
    ")": true, "]": true, "}": true, "\"": true, "''": true
  }
}
```

### Setting Values
- **"block"**: Prevent the action and show error
- **"notify"**: Show warning but allow action  
- **"disabled"**: No validation or notification

## Pre-Migration Checklist
- [ ] Database backup completed
- [ ] Verify PostgreSQL version compatibility (9.4+)
- [ ] Confirm sufficient disk space for JSONB index
- [ ] Test migration on development environment
- [ ] Notify users of brief downtime (if applicable)

## Deployment Instructions

### Method 1: Using Migration Script (Recommended)
```bash
cd transcription-system/backend
npm run ts-node scripts/run-autocorrect-migration.ts
```

### Method 2: Direct SQL Execution
```bash
psql -d your_database_name -f migrations/019_add_autocorrect_settings.sql
```

### Method 3: Manual Execution
```sql
-- Connect to your database and execute the migration file content
\i migrations/019_add_autocorrect_settings.sql
```

## Performance Impact
- **Expected Duration**: 1-5 seconds (depending on user count)
- **Lock Level**: Brief exclusive lock during column addition
- **Index Creation**: Uses CONCURRENTLY (no long locks)
- **Memory Impact**: Minimal (JSONB is compressed)

## Verification Queries

### Check Column Creation
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'autocorrect_settings';
```

### Check Index Creation
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' AND indexname = 'idx_users_autocorrect_settings';
```

### Verify Default Values
```sql
SELECT username, autocorrect_settings->>'blockDuplicateSpeakers' as block_duplicates
FROM users 
WHERE autocorrect_settings IS NOT NULL
LIMIT 5;
```

### Performance Test
```sql
-- Test JSONB query performance
EXPLAIN ANALYZE 
SELECT count(*) 
FROM users 
WHERE autocorrect_settings->>'blockDuplicateSpeakers' = 'block';
```

## Rollback Procedures

### Immediate Rollback (if issues detected)
```bash
npm run ts-node scripts/run-autocorrect-migration.ts rollback
```

### Manual Rollback
```sql
-- Execute rollback script
\i migrations/019_add_autocorrect_settings_rollback.sql
```

### Rollback Verification
```sql
SELECT COUNT(*) as column_exists
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'autocorrect_settings';
-- Should return 0 after successful rollback
```

## Application Code Impact

### Backend Changes Required
1. Update user model/type definitions to include `autocorrect_settings`
2. Modify user queries to handle JSONB field
3. Add API endpoints for managing auto-correct settings

### Frontend Changes Required  
1. Add auto-correct settings UI components
2. Implement real-time validation based on settings
3. Update transcription editor to respect user preferences

### TypeScript Interface
```typescript
interface AutoCorrectSettings {
  blockDuplicateSpeakers: 'block' | 'notify' | 'disabled';
  requirePunctuation: 'block' | 'notify' | 'disabled';
  preventDoubleSpace: 'block' | 'notify' | 'disabled';
  fixSpaceBeforePunctuation: 'block' | 'notify' | 'disabled';
  validateParentheses: 'block' | 'notify' | 'disabled';
  validateQuotes: 'block' | 'notify' | 'disabled';
  autoCapitalize: 'block' | 'notify' | 'disabled';
  fixNumberFormatting: 'block' | 'notify' | 'disabled';
  validEndingPunctuation: { [key: string]: boolean };
  punctuationForSpaceFix: { [key: string]: boolean };
}
```

## Monitoring & Health Checks

### Query Performance Monitoring
```sql
-- Monitor slow queries involving autocorrect_settings
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%autocorrect_settings%' 
ORDER BY mean_time DESC;
```

### Storage Usage
```sql
-- Check JSONB column storage usage
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename = 'users';
```

## Troubleshooting

### Common Issues

1. **Migration hangs**: Check for long-running transactions blocking table
2. **Out of disk space**: Ensure sufficient space for index creation
3. **Permission errors**: Verify database user has ALTER TABLE privileges
4. **JSONB parse errors**: Check default value syntax

### Emergency Contacts
- DBA: [contact info]
- Development Team: [contact info]
- Infrastructure Team: [contact info]

## Success Criteria
- [ ] Migration completes without errors
- [ ] All existing users have default auto-correct settings
- [ ] Index created successfully
- [ ] No performance degradation
- [ ] Verification queries return expected results
- [ ] Application functionality unaffected

## Post-Migration Tasks
1. Update API documentation
2. Create user guide for auto-correct features
3. Set up monitoring alerts for JSONB query performance
4. Plan feature rollout to users
5. Update backup/recovery procedures to include JSONB data