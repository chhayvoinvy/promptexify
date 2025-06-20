# Role-Based Access Control Implementation

## Overview

This implementation provides role-based access control for the dashboard area, ensuring that users with the "USER" role can only access `/dashboard/bookmarks` and `/dashboard/favorites`, while "ADMIN" users have full access to all dashboard features.

## Key Components

### 1. User Roles in Database (Prisma Schema)

- `UserRole` enum: `USER` | `ADMIN`
- Default role for new users: `USER`
- Admin users have full dashboard access

### 2. Authentication Utilities (`lib/auth.ts`)

- `requireAuth()`: Ensures user is authenticated, redirects to signin if not
- `requireAdmin()`: Ensures user has ADMIN role, redirects USER role to `/dashboard/bookmarks`
- `requireRole(allowedRoles)`: Checks if user has one of the allowed roles

### 3. Client-side Utilities (`lib/auth-utils.ts`)

- `hasRole(user, role)`: Check if user has specific role
- `isAdmin(user)`: Check if user is admin
- `isUser(user)`: Check if user is regular user
- Type definitions for `UserData` and `UserWithData`

### 4. Middleware Protection (`lib/supabase/middleware.ts`)

- Handles authentication check for all `/dashboard/*` routes
- Implements role-based redirects:
  - USER role accessing `/dashboard` → redirected to `/dashboard/bookmarks`
  - USER role accessing admin routes → redirected to `/dashboard/bookmarks`
  - ADMIN role → full access to all routes

### 5. Admin-Only Route Protection

Admin-only routes automatically redirect USER role to `/dashboard/bookmarks`:

- `/dashboard` (main dashboard)
- `/dashboard/posts`
- `/dashboard/categories`
- `/dashboard/tags`
- `/dashboard/analytics`
- `/dashboard/capture`
- `/dashboard/proposals`
- `/dashboard/prompts`
- `/dashboard/settings`

### 6. User-Accessible Routes

These routes are accessible to both USER and ADMIN roles:

- `/dashboard/bookmarks`
- `/dashboard/favorites`

### 7. Sidebar Navigation (`components/dashboard/admin-sidebar.tsx`)

- Dynamic navigation based on user role
- USER role sees: Bookmarks, Favorites, Settings, Help, Search
- ADMIN role sees: All navigation items including content management
- Brand logo redirects based on role (USER → bookmarks, ADMIN → dashboard)

## How It Works

### For USER Role:

1. User logs in and is assigned USER role by default
2. Accessing `/dashboard` redirects to `/dashboard/bookmarks`
3. Sidebar shows limited navigation options
4. Attempting to access admin routes redirects to bookmarks
5. Can access bookmarks and favorites pages

### For ADMIN Role:

1. Admin user (manually set in database) has full access
2. Can access main dashboard with analytics and management features
3. Sidebar shows all navigation options including content management
4. Can create, edit, and manage posts, categories, and tags

## Security Features

### Multi-Layer Protection:

1. **Middleware Level**: First line of defense, handles redirects based on URL patterns
2. **Page Level**: Each page uses `requireAuth()` or `requireAdmin()` for server-side protection
3. **Component Level**: Sidebar conditionally renders based on user role

### Secure Implementation:

- Input validation using Zod schemas
- Parameterized database queries via Prisma
- Proper error handling without exposing sensitive information
- Authentication state managed by Supabase
- Role data stored in local database for quick access

## Usage Examples

### Protecting an Admin-Only Page:

```typescript
export default async function AdminPage() {
  const user = await requireAdmin(); // Redirects USER role automatically
  return <AdminContent user={user} />;
}
```

### Protecting Any Authenticated Page:

```typescript
export default async function UserPage() {
  const user = await requireAuth(); // Redirects unauthenticated users
  return <UserContent user={user} />;
}
```

### Client-Side Role Checking:

```typescript
import { isAdmin } from "@/lib/auth-utils";

function MyComponent({ user }) {
  if (isAdmin(user)) {
    return <AdminFeatures />;
  }
  return <UserFeatures />;
}
```

## Testing Access Control

### As USER Role:

- Try accessing `/dashboard` → Should redirect to `/dashboard/bookmarks`
- Try accessing `/dashboard/posts` → Should redirect to `/dashboard/bookmarks`
- Access `/dashboard/bookmarks` → Should work normally
- Sidebar should show limited options

### As ADMIN Role:

- Access `/dashboard` → Should show full dashboard
- Access all admin routes → Should work normally
- Sidebar should show all management options

## Notes

- All new users are created with USER role by default
- Admin users must be manually promoted in the database
- The system uses hybrid auth: Supabase for authentication, Prisma for user data/roles
- Middleware provides the first layer of protection for performance
- Server-side protection ensures security even if client-side code is bypassed
