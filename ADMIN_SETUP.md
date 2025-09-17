# Admin Setup Guide

## 🔑 Who is Admin?

**Current Admin:** `moxton@gmail.com` (your email)

## How to Add More Admins

1. **Edit `.env.local`:**
   ```env
   VITE_ADMIN_EMAILS=moxton@gmail.com,admin2@example.com,admin3@example.com
   ```

2. **Restart your dev server** after changing environment variables

## Admin Features

When signed in as an admin, you'll see:

- **Blue "Admin" badge** next to your name
- **"Admin Panel" button** to toggle the dashboard
- **Deployment Status** - shows what needs to be deployed
- **Usage Analytics** - real-time security monitoring

## Current Status

### ✅ What's Working Now:
- Admin detection (sign in with `moxton@gmail.com`)
- Usage status display (with fallback when Edge Function isn't deployed)
- Basic rate limiting UI

### 🚧 What Needs Deployment:
1. **Database Tables** - Run the SQL from `supabase-schema.sql`
2. **Edge Function** - Deploy with `supabase functions deploy rate-limit`
3. **Full Security** - Once deployed, bulletproof rate limiting activates

## Quick Test

1. **Sign in with your Google account** (`moxton@gmail.com`)
2. **Look for the blue "Admin" badge** 
3. **Click "Admin Panel"** to see deployment status
4. **Check what needs to be deployed**

## Usage Display Fix

The usage counter now shows:
- **Anonymous users**: X/5 generations
- **Authenticated users**: X/10 generations  
- **Fallback mode**: Works even before Edge Function is deployed
- **Real-time updates**: Once security system is fully deployed

## Adding New Admins

Just add their email to `VITE_ADMIN_EMAILS` in your `.env.local`:
```env
VITE_ADMIN_EMAILS=moxton@gmail.com,newadmin@gmail.com
```

The admin panel will automatically appear when they sign in!