# TasteTribe Authentication System

## Overview

TasteTribe now includes a complete authentication system powered by Supabase Auth. This guide covers the implementation details, user flows, and integration points.

---

## Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [Pages & Routes](#pages--routes)
3. [User Journey](#user-journey)
4. [Database Integration](#database-integration)
5. [Session Management](#session-management)
6. [Error Handling](#error-handling)
7. [Security Features](#security-features)
8. [Testing](#testing)

---

## Authentication Flow

### High-Level Flow

```
Home Page
   ↓ (Click "Get Started")
Signup Page → Create Account → Onboarding → Social Feed
   ↓ (Already have account?)
Login Page → Verify Credentials → Check Onboarding Status
                                   ↓
                         Onboarding Complete?
                         YES → Social Feed
                         NO  → Onboarding
```

### Technical Flow

1. **Signup Process**:
   ```typescript
   User fills form → Validate input → supabase.auth.signUp()
   → Create profile record → Redirect to /onboarding
   ```

2. **Login Process**:
   ```typescript
   User fills form → Validate input → supabase.auth.signInWithPassword()
   → Check profile.onboarding_completed
   → Redirect to /onboarding OR /social
   ```

3. **Callback Handling**:
   ```typescript
   Email verification link → /auth/callback
   → Exchange code for session → Check onboarding status
   → Redirect appropriately
   ```

---

## Pages & Routes

### 1. Signup Page (`/auth/signup`)

**File**: `app/auth/signup/page.tsx`

**Features**:
- Email and password input with validation
- Password confirmation field
- Real-time error feedback
- Loading states during submission
- Success message with auto-redirect
- Link to login page for existing users
- Back to home link

**Validation Rules**:
- Email: Valid email format required
- Password: Minimum 6 characters
- Confirm Password: Must match password

**Integration**:
```typescript
const { data, error } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

**Profile Creation**:
```typescript
await supabase.from('profiles').upsert({
  id: data.user.id,
  onboarding_completed: false,
  created_at: new Date().toISOString(),
});
```

### 2. Login Page (`/auth/login`)

**File**: `app/auth/login/page.tsx`

**Features**:
- Email and password input with validation
- Real-time error feedback
- Loading states during submission
- "Forgot password" link (placeholder)
- Link to signup page for new users
- Back to home link

**Validation Rules**:
- Email: Valid email format required
- Password: Required (no length check on login)

**Post-Login Logic**:
```typescript
// Check if onboarding is complete
const { data: profile } = await supabase
  .from('profiles')
  .select('onboarding_completed')
  .eq('id', authData.user.id)
  .single();

// Redirect based on onboarding status
if (!profile?.onboarding_completed) {
  router.push('/onboarding');
} else {
  router.push('/social');
}
```

### 3. Auth Callback Route (`/auth/callback`)

**File**: `app/auth/callback/route.ts`

**Purpose**: Handle email verification and OAuth callbacks

**Flow**:
1. Extract code from URL parameters
2. Exchange code for session
3. Fetch user's profile
4. Check onboarding status
5. Redirect to appropriate page

**Error Handling**:
- Invalid code → Redirect to login with error
- Profile fetch fails → Redirect to onboarding
- Session exchange fails → Redirect to login with error

### 4. Onboarding Page (`/onboarding`)

**File**: `app/onboarding/page.tsx`

**Features**:
- Welcome message
- Feature overview
- Complete button that:
  - Updates profile.onboarding_completed to true
  - Redirects to /social

**Profile Update**:
```typescript
await supabase
  .from('profiles')
  .update({ onboarding_completed: true })
  .eq('id', user.id);
```

---

## User Journey

### New User Registration

1. User lands on home page
2. Clicks "Get Started" button
3. Redirected to `/auth/signup`
4. Fills out signup form:
   - Email address
   - Password (min 6 characters)
   - Confirm password
5. Submits form
6. Account created with Supabase Auth
7. Profile record created in database
8. Success message displayed
9. Auto-redirected to `/onboarding` after 1.5 seconds
10. Completes onboarding
11. Redirected to `/social` (activity feed)

### Returning User Login

1. User visits `/auth/login` (or clicks login link)
2. Enters email and password
3. Submits form
4. Credentials verified with Supabase
5. System checks onboarding status:
   - If complete → `/social`
   - If incomplete → `/onboarding`
6. User redirected appropriately

### Email Verification (if enabled)

1. User signs up
2. Receives verification email
3. Clicks verification link
4. Redirected to `/auth/callback?code=...`
5. Code exchanged for session
6. User authenticated
7. Redirected based on onboarding status

---

## Database Integration

### Profiles Table

**Required Columns**:
- `id` (uuid, primary key) - Matches auth.users.id
- `onboarding_completed` (boolean) - Tracks onboarding status
- `created_at` (timestamptz) - Account creation time

**Optional Columns** (already in schema):
- `display_name` (text) - User's display name
- `avatar_url` (text) - Profile picture URL
- `taste_profile` (jsonb) - User preferences
- `onboarding_step` (integer) - Current onboarding step
- `onboarding_completed_at` (timestamptz) - When onboarding finished

### Auth.users Table (Managed by Supabase)

Stores authentication data:
- `id` (uuid) - User identifier
- `email` (text) - User email
- `encrypted_password` - Hashed password
- `email_confirmed_at` - Email verification timestamp
- `last_sign_in_at` - Last login time
- And more Supabase metadata

---

## Session Management

### Client-Side Sessions

Sessions are managed automatically by Supabase client:

```typescript
// Create client (in component)
const supabase = createClient();

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Get session
const { data: { session } } = await supabase.auth.getSession();
```

### Server-Side Sessions

For API routes and server components:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        return cookies().get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookies().set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookies().set({ name, value: '', ...options });
      },
    },
  }
);
```

### Session Persistence

- Sessions stored in HTTP-only cookies
- Automatic refresh token handling
- Sessions persist across browser restarts
- Logout clears all session data

---

## Error Handling

### Client-Side Validation

**Email Validation**:
```typescript
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  setErrors({ email: 'Please enter a valid email address' });
}
```

**Password Validation**:
```typescript
if (password.length < 6) {
  setErrors({ password: 'Password must be at least 6 characters' });
}
```

**Password Match Validation**:
```typescript
if (password !== confirmPassword) {
  setErrors({ confirmPassword: 'Passwords do not match' });
}
```

### Supabase Error Handling

Common errors and how they're handled:

1. **User Already Exists**:
   ```typescript
   // Supabase returns: "User already registered"
   // Displayed to user with suggestion to login
   ```

2. **Invalid Credentials**:
   ```typescript
   // Supabase returns: "Invalid login credentials"
   // Displayed to user
   ```

3. **Network Errors**:
   ```typescript
   catch (error) {
     setErrors({ form: 'An unexpected error occurred. Please try again.' });
   }
   ```

### Error Display

All errors shown in red alert boxes:
```tsx
<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
  <AlertCircle className="h-5 w-5 text-red-500" />
  <p className="text-sm text-red-800">{error.message}</p>
</div>
```

---

## Security Features

### Password Security

- **Minimum Length**: 6 characters (configurable)
- **Hashing**: Bcrypt with salt (handled by Supabase)
- **Storage**: Only hashed passwords stored
- **Transmission**: HTTPS only

### CSRF Protection

- HTTP-only cookies prevent XSS attacks
- SameSite cookie attribute set
- CSRF tokens managed by Supabase

### Input Sanitization

- Email validation prevents injection
- Password fields use type="password"
- Form data validated before submission

### Rate Limiting

Supabase provides built-in rate limiting:
- Login attempts limited per IP
- Signup attempts limited per IP
- Configurable in Supabase dashboard

### SQL Injection Prevention

- Supabase client uses parameterized queries
- All database access through safe APIs
- No raw SQL from user input

---

## Testing

### Manual Testing Checklist

**Signup Flow**:
- [ ] Form validation (email, password, confirm)
- [ ] Successful account creation
- [ ] Profile record created in database
- [ ] Redirect to onboarding works
- [ ] Error handling for existing user
- [ ] Error handling for weak password

**Login Flow**:
- [ ] Form validation (email, password)
- [ ] Successful login with valid credentials
- [ ] Error for invalid credentials
- [ ] Correct redirect based on onboarding status
- [ ] Session persistence after login

**Onboarding Flow**:
- [ ] Page displays correctly
- [ ] Complete button updates database
- [ ] Redirect to social feed works
- [ ] Cannot access without authentication

**Callback Flow**:
- [ ] Email verification link works
- [ ] Code exchange successful
- [ ] Correct redirect after verification
- [ ] Error handling for invalid codes

### Test User Creation

Create test users directly:

```typescript
// Via signup page
Email: test@example.com
Password: test123

// Verify in database
SELECT * FROM auth.users WHERE email = 'test@example.com';
SELECT * FROM profiles WHERE id = '<user-id>';
```

### Testing Commands

```bash
# Build and check for errors
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## Configuration

### Environment Variables

Required in `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Auth Settings

Configure in Supabase Dashboard → Authentication:

1. **Email Settings**:
   - Email confirmation: Optional (currently disabled)
   - Email change confirmation: Recommended
   - Secure email change: Recommended

2. **Password Settings**:
   - Minimum password length: 6 (default)
   - Password strength: Optional

3. **Rate Limiting**:
   - Enable for production
   - Configure per-endpoint limits

4. **Site URL**:
   - Set to your production URL
   - Used for redirects

5. **Redirect URLs**:
   - Add all allowed callback URLs
   - Include development and production

---

## Troubleshooting

### Common Issues

**Issue**: "User already registered" error
- **Cause**: Email already exists in database
- **Solution**: Use login page instead

**Issue**: Redirect loops after login
- **Cause**: Onboarding status not properly set
- **Solution**: Check profiles table, manually set onboarding_completed

**Issue**: Session not persisting
- **Cause**: Cookie issues or client misconfiguration
- **Solution**: Verify Supabase client setup, check browser cookies

**Issue**: "Invalid login credentials"
- **Cause**: Wrong email/password or account not confirmed
- **Solution**: Verify credentials, check email for confirmation link

### Debug Commands

```typescript
// Check current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// Check profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user?.id)
  .single();
console.log('Profile:', profile);
```

---

## Future Enhancements

### Planned Features

1. **Password Reset**:
   - Forgot password flow
   - Email with reset link
   - Reset password page

2. **Social Auth**:
   - Google OAuth
   - GitHub OAuth
   - Apple Sign In

3. **Email Verification**:
   - Enable email confirmation
   - Resend verification email
   - Verification status indicator

4. **Two-Factor Authentication**:
   - TOTP setup
   - SMS verification
   - Backup codes

5. **Account Management**:
   - Change email
   - Change password
   - Delete account

---

## Support

For issues or questions:
- Check Supabase Auth documentation
- Review error logs in browser console
- Verify database schema matches requirements
- Test with different browsers/devices

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Status**: Production Ready
