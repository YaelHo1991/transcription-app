# Login System Plan

## Multiple Login Styles Approach

Since CRM and Transcription have different login page designs, we'll implement:

### Option 1: Query Parameter Based (Recommended)
```
/login?system=crm        - CRM styled login
/login?system=transcription - Transcription styled login
/login                   - Default login (or redirect to choose)
```

### Option 2: Separate Routes
```
/login/crm              - CRM login page
/login/transcription    - Transcription login page
```

### Option 3: Subdomain Based (for production)
```
crm.domain.com/login    - CRM styled
app.domain.com/login    - Transcription styled
```

## Implementation Structure

```typescript
// login/page.tsx
export default function LoginPage({ searchParams }) {
  const system = searchParams?.system || 'default';
  
  return (
    <div className={styles[`${system}Login`]}>
      {/* Shared login logic */}
      {/* Different styling based on system */}
    </div>
  );
}
```

## Styling Files
- `login.module.css` - Base shared styles
- `login-crm.module.css` - CRM specific styling (pink theme)
- `login-transcription.module.css` - Transcription styling (brown theme)

## Shared Logic
- Same authentication endpoint
- Same JWT token handling
- Same user validation
- Different visual presentation

## Navigation Flow
1. User clicks "התחבר" on CRM → `/login?system=crm`
2. User clicks "כניסה" on Transcription → `/login?system=transcription`
3. After login → Redirect to appropriate system based on permissions

## Notes
- Maintains brand consistency per system
- Single authentication backend
- Reusable login component with different themes