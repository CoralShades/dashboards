# Unified Project Structure

[← Back to Index](index.md)

---

## Appendix A: Component Reusability Matrix

This matrix shows how components from the existing PolicyAI application are being reused in the BI Dashboard Portal.

| Component Category       | PolicyAI Component           | BI Dashboard Usage                          | Modification Level |
| ------------------------ | ---------------------------- | ------------------------------------------- | ------------------ |
| **Authentication**       | `AuthForm.tsx`               | ✅ Reused as-is                             | None               |
|                          | `ProtectedRoute.tsx`         | ✅ Enhanced with role-based checks          | Minor              |
|                          | `AuthContext.tsx`            | ✅ Enhanced to fetch user role from DB      | Minor              |
| **UI Components**        | All shadcn/ui components     | ✅ Reused as-is                             | None               |
|                          | `Button`, `Card`, `Input`    | ✅ Used throughout BI Dashboard             | None               |
|                          | `Dialog`, `Table`, etc.      | ✅ Used for admin CRUD operations           | None               |
| **Layout**               | Base layout structure        | ✅ Adapted for dashboard portal layout      | Moderate           |
|                          | Navigation components        | ✅ Extended with role-based menu items      | Minor              |
| **Hooks**                | `use-toast.ts`               | ✅ Reused for notifications                 | None               |
|                          | `use-mobile.tsx`             | ✅ Reused for responsive design             | None               |
| **Supabase Integration** | `supabase/client.ts`         | ✅ Reused as-is                             | None               |
|                          | Auth service                 | ✅ Reused and extended                      | Minor              |
| **New Components**       | `DashboardCard.tsx`          | ✨ New - Displays dashboard info            | N/A                |
|                          | `XeroConnectionWizard.tsx`   | ✨ New - Handles Xero OAuth                 | N/A                |
|                          | `XeroDataRefreshButton.tsx`  | ✨ New - Triggers manual data refresh       | N/A                |
|                          | `BIDashboardPortal.tsx`      | ✨ New - Main dashboard viewer page         | N/A                |
|                          | `Settings.tsx`               | ✨ New - Settings page with Xero connection | N/A                |

### Component Enhancement Details

#### `AuthContext.tsx` Enhancement

**Original:** Only provided authentication state (user, session, loading).

**Enhanced:** Now fetches the user's role from the `profiles` table and includes it in the context.

**File: `src/contexts/AuthContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  role: string | null // ✨ NEW
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null, // ✨ NEW
  loading: true,
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<string | null>(null) // ✨ NEW
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserRole(session.user.id) // ✨ NEW
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserRole(session.user.id) // ✨ NEW
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ✨ NEW FUNCTION
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) throw error
      setRole(data?.role ?? 'viewer')
    } catch (error) {
      console.error('Error fetching user role:', error)
      setRole('viewer') // Default to viewer on error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

#### `ProtectedRoute.tsx` Enhancement

**Original:** Only checked if user was authenticated.

**Enhanced:** Now supports role-based access control.

**File: `src/components/auth/ProtectedRoute.tsx`**

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'editor' | 'viewer' // ✨ NEW
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // ✨ NEW: Role-based access control
  if (requiredRole) {
    const roleHierarchy = { viewer: 1, editor: 2, admin: 3 }
    const userLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0
    const requiredLevel = roleHierarchy[requiredRole]

    if (userLevel < requiredLevel) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}
```

---

## Appendix B: Updated Routing Architecture

The routing structure has been updated to include new BI Dashboard-specific routes.

### Route Configuration

**File: `src/App.tsx` (excerpt)**

```typescript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Auth } from '@/pages/Auth'
import { Index } from '@/pages/Index'
import { Dashboard } from '@/pages/Dashboard'
import { Notebook } from '@/pages/Notebook'
import { BIDashboardPortal } from '@/pages/BIDashboardPortal' // ✨ NEW
import { Settings } from '@/pages/Settings' // ✨ NEW
import { NotFound } from '@/pages/NotFound'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          
          {/* ✨ NEW: BI Dashboard Portal (all authenticated users) */}
          <Route
            path="/bi-dashboard"
            element={
              <ProtectedRoute>
                <BIDashboardPortal />
              </ProtectedRoute>
            }
          />

          {/* ✨ NEW: Settings page (all authenticated users) */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Admin-only routes (from PolicyAI) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notebook/:id"
            element={
              <ProtectedRoute>
                <Notebook />
              </ProtectedRoute>
            }
          />

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
```

### Route Access Matrix

| Route            | Path              | Access Level        | Description                          |
| ---------------- | ----------------- | ------------------- | ------------------------------------ |
| **Public**       | `/auth`           | Anyone              | Login/signup page                    |
| **Protected**    | `/`               | Authenticated users | PolicyAI main page                   |
|                  | `/bi-dashboard`   | Authenticated users | ✨ BI Dashboard Portal (NEW)         |
|                  | `/settings`       | Authenticated users | ✨ Settings & Xero connection (NEW)  |
|                  | `/notebook/:id`   | Authenticated users | PolicyAI notebook viewer             |
| **Admin Only**   | `/dashboard`      | Admin role only     | PolicyAI admin dashboard             |

### Navigation Menu Updates

The navigation menu has been updated to include links to the new BI Dashboard Portal and Settings pages.

**Enhanced Navigation Logic:**

* All authenticated users see "BI Dashboard Portal" and "Settings" links.
* Only admins see the "Admin Dashboard" link (PolicyAI).
* The navigation is responsive and adapts to the user's role.

---

## Project File Structure

```
d:\ailocal\dashboards\
├── public/
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthForm.tsx               # ✅ Reused
│   │   │   └── ProtectedRoute.tsx         # ✅ Enhanced with roles
│   │   ├── dashboard/
│   │   │   ├── DashboardCard.tsx          # ✨ NEW
│   │   │   └── XeroDataRefreshButton.tsx  # ✨ NEW
│   │   ├── settings/
│   │   │   └── XeroConnectionWizard.tsx   # ✨ NEW
│   │   └── ui/                            # ✅ shadcn/ui components (reused)
│   ├── contexts/
│   │   └── AuthContext.tsx                # ✅ Enhanced with role fetching
│   ├── hooks/
│   │   ├── use-toast.ts                   # ✅ Reused
│   │   ├── use-mobile.tsx                 # ✅ Reused
│   │   └── useXeroConnection.tsx          # ✨ NEW
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.ts                  # ✅ Reused
│   ├── pages/
│   │   ├── Auth.tsx                       # ✅ Reused
│   │   ├── Index.tsx                      # ✅ Reused (PolicyAI)
│   │   ├── Dashboard.tsx                  # ✅ Reused (PolicyAI admin)
│   │   ├── Notebook.tsx                   # ✅ Reused (PolicyAI)
│   │   ├── BIDashboardPortal.tsx          # ✨ NEW
│   │   ├── Settings.tsx                   # ✨ NEW
│   │   └── NotFound.tsx                   # ✅ Reused
│   ├── App.tsx                            # ✅ Enhanced with new routes
│   └── main.tsx                           # ✅ Reused
├── supabase/
│   ├── functions/
│   │   ├── xero-oauth-callback/           # ✨ NEW
│   │   ├── xero-refresh-token/            # ✨ NEW
│   │   └── xero-etl-extract/              # ✨ NEW
│   └── migrations/
│       ├── 20241219_initial_bi_dashboard_schema.sql  # ✨ NEW
│       └── 20241219_xero_token_encryption.sql        # ✨ NEW
├── docs/
│   ├── architecture.md                    # ✅ Original (to be archived)
│   └── architecture/                      # ✨ NEW (sharded)
│       ├── index.md
│       ├── high-level-architecture.md
│       ├── tech-stack.md
│       ├── data-models-database-schema.md
│       ├── api-specification.md
│       ├── security.md
│       ├── testing-strategy.md
│       ├── development-workflow.md
│       └── unified-project-structure.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Key Directory Purposes

* **`src/components/dashboard/`** - BI Dashboard-specific components
* **`src/components/settings/`** - Settings page components (Xero connection)
* **`src/pages/`** - All page components (both PolicyAI and BI Dashboard)
* **`supabase/functions/`** - Serverless Edge Functions for Xero integration
* **`supabase/migrations/`** - Database schema migrations
* **`docs/architecture/`** - Sharded architecture documentation
