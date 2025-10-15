# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Centralized BI Dashboard Portal** is a secure, role-based platform for accessing centralized business intelligence dashboards. It integrates with Xero as a primary data source, uses n8n for automated ETL pipelines, and provides a unified portal for teams to access relevant BI dashboards based on their roles.

### Key Project Context

- **Transformation Goal**: Create a centralized portal for accessing business intelligence dashboards with secure role-based access
- **Primary Users**: Internal teams with different access levels (Admin, Manager, Analyst, Viewer roles)
- **Core Value**: Streamline access to business intelligence while maintaining data security through role-based access control
- **Security Model**: Role-Based Access Control (RBAC) enforced at database level via Supabase RLS

## Common Development Commands

### Development
- `npm run dev` - Start development server with Vite
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Lint code with ESLint
- `npm run preview` - Preview production build locally

### BMAD Commands

- `npm run bmad:refresh` - Refresh BMAD method installation
- `npm run bmad:list` - List available BMAD agents
- `npm run bmad:validate` - Validate BMAD configuration

## Architecture Overview

### Technical Stack

- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions) + N8N workflows  
- **Database**: PostgreSQL with Row Level Security (RLS)
- **ETL/Automation**: n8n for data extraction from Xero and Workflow Max
- **External APIs**: Xero API, Workflow Max/XPM API
- **BI Tools**: Google Looker Studio, Microsoft Power BI, Metabase (embedded via iframes)
- **State Management**: React Query (@tanstack/react-query)

### Critical Architecture Components

#### Database Schema (BI Dashboard Portal)

- `dashboards` table: Dashboard metadata with role-based access control
- `user_roles` table: Role assignments (Admin, Manager, Analyst, Viewer)
- `xero_connections` table: OAuth connection details for Xero integration
- `data_sources` table: Configuration for various data sources
- `dashboard_access` table: Junction table for dashboard-role mappings

#### Key Features

- **Dashboard Embedding**: Secure iframe embedding of BI tools (Looker Studio, Power BI, Metabase)
- **Xero Integration**: OAuth 2.0 flow for secure Xero API connection
- **Automated ETL**: Daily data pipelines via n8n from Xero/Workflow Max to analytics databases
- **Role-Based Access**: Granular access control ensuring users only see relevant dashboards

### Component Architecture

```text
src/
├── components/
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Main dashboard grid and BI iframe components
│   ├── xero/              # Xero integration wizard and connection management
│   ├── admin/             # Admin panel for user/role management
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks for data fetching
├── contexts/              # React contexts (AuthContext)
├── integrations/supabase/ # Supabase client and types
├── services/              # API services for Xero, dashboard management
└── pages/                 # Main application pages
```

## Key Development Patterns

### Role-Based Data Access

All database queries MUST respect role-based access:

```typescript
// Example pattern - always filter by user role
const { data } = useQuery({
  queryKey: ['dashboards', userRole],
  queryFn: async () => {
    return supabase
      .from('dashboards')
      .select('*')
      .eq('allowed_roles', userRole); // Critical: role-based filtering
  }
});
```

### Security Requirements

- **RLS Enforcement**: All data access controlled by Supabase Row Level Security
- **OAuth Integration**: Secure Xero API integration using OAuth 2.0 Authorization Code Flow
- **Dashboard Isolation**: Strict role-based dashboard access with zero cross-role data leakage
- **API Security**: All external API calls (Xero, BI tools) properly authenticated and authorized

## Critical Implementation Details

### Xero Integration Pattern

**OAuth 2.0 Flow Implementation**:

- Authorization initiated from frontend
- OAuth callback handled by Supabase Edge Function
- Refresh tokens securely stored and managed
- Automatic token refresh for API calls

### Dashboard Embedding Strategy

1. **iframe Security**: Proper sandboxing and CSP headers
2. **URL Generation**: Dynamic URL generation based on user role and permissions
3. **Error Handling**: Graceful fallbacks for unavailable dashboards
4. **Loading States**: Proper loading indicators for embedded content

### N8N Workflow Integration

Key workflows in `n8n/` directory:

- **Xero Data Extraction**: Daily sync of financial data from Xero API
- **Workflow Max Integration**: Project and time tracking data extraction
- **Data Transformation**: ETL processes for BI tool compatibility
- **Error Notifications**: Automated alerts for failed data pipelines

## Development Guidelines

### Authentication Flow

- Uses Supabase Auth with custom AuthContext
- Protected routes enforce authentication
- Role assignment managed through admin interface

### Error Handling

- Toast notifications (Sonner) for user feedback
- Graceful handling of dashboard loading failures
- Clear messaging for insufficient permissions or connection issues

### Testing Requirements

Per architecture document:

- **Unit Tests**: Business logic and role-based access control
- **Integration Tests**: Xero OAuth flow, dashboard embedding, n8n workflows
- **E2E Tests**: Critical user flows (login, dashboard access, Xero connection wizard)
- **API Tests**: External API integration reliability (Xero, BI platforms)

## Important Notes

### BMAD Integration

Project uses BMAD methodology with specialized agents:

- Developer, Architect, QA, Product Manager, UX Expert agents
- Agent rules defined in `.bmad-core/` directory

### Environment Dependencies

- Supabase project with proper RLS policies for dashboard access
- N8N instance with BI Dashboard Portal-specific workflows
- Xero Developer App with OAuth 2.0 credentials
- Proper role-based database setup with dashboard access controls

### Documentation References

- **Project Brief**: `docs/project brief.md` - Overall vision and requirements
- **PRD**: `docs/prd.md` - Detailed product requirements and user stories
- **Architecture**: `docs/architecture.md` - Technical architecture and patterns
- **UI/UX Spec**: `docs/ui-ux-spec.md` - Design specifications for BI dashboard portal
