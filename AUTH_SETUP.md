# Authentication Setup Guide

## Overview
Nexora HCM now supports two authentication methods:
1. **Email/Password** - Traditional credentials-based login
2. **Google OAuth** - Sign in with Google account

Both methods automatically determine user role (Admin or Employee) and redirect to the appropriate dashboard.

## Creating Users

### Method 1: Using the Script
Create a user with email and password:

```bash
npx ts-node scripts/create-user.ts <email> <password> [name]
```

**Examples:**
```bash
# Create an admin user
npx ts-node scripts/create-user.ts admin@nexora.com Admin123! "Admin User"

# Create an employee user (make sure email exists in Employee table)
npx ts-node scripts/create-user.ts employee@company.com Pass123! "John Doe"
```

### Method 2: Direct Database Insert
You can also create users directly in your database with a hashed password.

## Role Determination

### Admin Users
A user is considered an admin if their email:
- Matches specific admin emails defined in `src/lib/auth.ts`:
  - `admin@nexora.com`
  - `sysadmin@nexora.com`
- Ends with `@admin.nexora.com`

**To add more admin emails:**
Edit `src/lib/auth.ts` and add emails to the `adminEmails` array:
```typescript
const adminEmails = [
  "admin@nexora.com",
  "youradmin@gmail.com", // Add your email here
];
```

### Employee Users
A user is considered an employee if their email exists in the `Employee` table in the database.

## Authentication Flow

1. **User enters credentials** (email/password) or clicks "Continue with Google"
2. **System validates credentials** and checks user role
3. **Automatic redirection:**
   - Admins → `/admin` dashboard
   - Employees → `/employee` dashboard
4. **Access denied** if user is neither admin nor employee

## Testing Authentication

### Test URLs
- Sign In: `http://localhost:3000/auth/signin`
- Sign Out: `http://localhost:3000/auth/signout`
- Error Page: `http://localhost:3000/auth/error`
- Unauthorized: `http://localhost:3000/auth/unauthorized`

### Test Credentials
After creating a user with the script, you can test with:
- Email: The email you provided
- Password: The password you provided

## Security Features

✅ **Password Hashing** - Uses bcrypt with salt rounds
✅ **Role-Based Access** - Automatic role detection
✅ **JWT Sessions** - Secure token-based sessions
✅ **Error Handling** - Graceful error messages
✅ **Access Control** - Only authorized users can sign in

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
# Database
DATABASE_URL="your-database-url"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth (optional, for Google sign-in)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Troubleshooting

### "Invalid email or password"
- Check that the user exists in the database
- Verify the password is correct
- Ensure the user has a password field (not null)

### "You don't have access to this system"
- User is not an admin (not in admin list)
- User email doesn't exist in Employee table
- Add user to appropriate role

### Google Sign-In Not Working
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Check Google OAuth consent screen settings
- Ensure authorized redirect URIs include your app URL

## Database Schema

The `User` model includes:
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?   // For credentials login
  accounts      Account[]
  sessions      Session[]
}
```

## Next Steps

1. Create admin and employee users using the script
2. Test authentication with both methods
3. Customize admin email list as needed
4. Set up proper environment variables for production
