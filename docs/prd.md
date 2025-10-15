# Centralized BI Dashboard Portal Product Requirements Document (PRD)

## Goals and Background Context

### Goals
* **Centralize BI Access**: Provide a single, user-friendly portal for all 20 team members to access BI dashboards.
* **Implement Role-Based Access Control**: Ensure users can only view dashboards and data relevant to their specific roles, eliminating unauthorized data access.
* **Automate Data Pipeline**: Maintain a fully automated and reliable daily data pipeline from Xero and Workflow Max to Supabase with greater than 99% uptime.
* **Ensure Future Flexibility**: Build an architecture that can simultaneously support embedded dashboards from both Google Looker Studio, Microsoft Power BI, and Metabase.
* **Enable Self-Service Integration**: Allow users to securely connect their own Xero accounts via a frontend OAuth wizard.

### Background Context
Our organization relies on key business data from Xero and Workflow Max, processed via an n8n workflow into a Supabase database, to make informed decisions. Currently, our growing team of 20 members lacks a centralized or secure method to access these BI dashboards, leading to fragmented access, inefficient permissions management, and potential data governance risks.

This project will create a scalable, secure portal that solves these issues by providing authenticated, role-based access to the correct set of dashboards, ensuring team members can efficiently access the insights they need while strengthening our data security posture.

### Brownfield Project Context
**CRITICAL:** This is a **brownfield transformation project**, not a greenfield build. We are repurposing an existing PolicyAI application codebase.

**Existing Infrastructure:**
- **Source Codebase:** PolicyAI application with React 18.3.1 + Vite + TypeScript + Supabase
- **UI Framework:** Shadcn UI components with Tailwind CSS (fully configured)
- **Authentication:** Supabase Auth with existing AuthContext provider
- **Routing:** react-router-dom v6 (functional)
- **State Management:** React Context API + TanStack Query

**Reusable Components:**
- ✅ Complete Shadcn UI library (`src/components/ui/*`)
- ✅ Authentication components (`src/components/auth/*`)
- ✅ Supabase client configuration
- ✅ Base utility hooks and functions

**Not Reusable (PolicyAI-Specific):**
- ❌ Notebook/chat/document processing components
- ❌ PolicyAI-specific hooks and pages

**Development Approach:** Leverage existing infrastructure while adding BI-specific tables, components, and features. We will NOT rebuild authentication, routing, or UI components from scratch.

### Change Log
| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2025-10-15 | 2.0 | Major update: Added brownfield context, rewrote Epic 1 for existing project rebranding, added Epic 2 for integrated ETL (Edge Functions), updated technical stack references, corrected "Dashibase" references to actual React+Vite stack, renumbered remaining epics. | Winston (Architect) |
| 2025-09-23 | 1.2 | Updated frontend framework from framework to React/Vite to align with architecture document. | John (PM) |
| 2025-09-23 | 1.1 | Updated Epics and Stories with specific dashboard requirements from client document. | John (PM) |
| 2025-09-23 | 1.0 | Initial PRD draft based on Project Brief. | John (PM) |

## Requirements

### Functional
* **FR1**: The system must provide secure user authentication (registration, login, logout) using email and password, handled by Supabase Authentication.
* **FR2**: The main portal page must conditionally render a specific set of embedded dashboards based on the logged-in user's assigned role ('admin', 'role\_a', 'role\_b').
* **FR3**: The portal must support embedding reports via `<iframe>` from both Google Looker Studio, Microsoft Power BI, and Metabase.
* **FR4**: The system must utilize a Supabase database with a `profiles` table to link authenticated users to their roles.
* [cite_start]**FR5**: A daily automated n8n workflow must extract data from Xero and Workflow Max and load it into the Supabase database[cite: 3, 31].
* **FR6**: The application will be built using the Dashibase (React / Vite + Supabase) boilerplate to accelerate development.

### Non Functional
* **NFR1**: Data in all dashboards must be consistently refreshed daily.
* **NFR2**: The automated data pipeline must maintain >99% uptime with no manual intervention required.
* **NFR3**: The system must be secure, with zero reported incidents of users accessing data or dashboards not assigned to their role.
* **NFR4**: The portal architecture must be scalable and flexible enough to support the simultaneous embedding of dashboards from both Looker Studio and Power BI.
* **NFR5**: The application will be deployed on Vercel or Netlify.

## User Interface Design Goals

### Overall UX Vision
A clean, professional, and intuitive interface that allows users to access their required dashboards with minimal clicks. The primary focus is on clarity and ease of access; complex in-app data filtering is explicitly out of scope for the MVP.

### Key Interaction Paradigms
The core interaction is presentational. Users log in and are immediately presented with the dashboards relevant to their role. All data interaction (filtering, drill-downs) occurs within the embedded BI tools themselves, not the portal.

### Core Screens and Views
* Login / Registration Screen
* Main Dashboard Portal Page (which hosts the embedded `<iframe>` reports)

### Accessibility: WCAG AA
The portal should adhere to WCAG AA standards as a baseline for accessibility, ensuring it is usable by all internal team members.

### Branding
The portal should use the standard corporate branding and style guide for internal tools.

### Target Device and Platforms: Web Responsive
The application should be fully responsive and accessible on standard desktop and tablet browsers, as these are the primary devices for viewing BI dashboards.

## Technical Assumptions

### Repository Structure: Monorepo
The project will use a monorepo structure, as the Dashibase boilerplate provides a single, integrated React / Vite application.

### Service Architecture: Monolith (Serverless)
The project is a single React / Vite application that leverages Supabase for its backend services (Auth, Database), fitting a monolithic but serverless-first architectural pattern.

### Testing Requirements: Unit + Integration
Testing will focus on unit tests for critical logic (e.g., role-gating) and integration tests to ensure reliable connections to Supabase and the data pipeline.

### Additional Technical Assumptions and Requests
* **Existing Codebase**: PolicyAI application being repurposed (React + Vite + TypeScript)
* **Frontend Framework**: React 18.3.1 with Vite
* **Backend & Authentication**: Supabase (already configured)
* **Data Automation (Primary)**: Supabase Edge Functions with pg_cron scheduling for user-specific ETL
* **Data Automation (Fallback)**: n8n as backup mechanism if Edge Functions fail
* [cite_start]**Primary Data Source**: Xero, Workflow Max / XPM[cite: 3, 31].
* **BI Tools**: Google Looker Studio, Microsoft Power BI, and Metabase.
* **Deployment**: Vercel or Netlify.

## Epic List

* **Epic 1: Foundation & Core Portal Setup**: Rebrand existing project, configure database schema, enhance authentication with role-based access, and create proof-of-concept dashboard display.
* **Epic 2: Integrated ETL Infrastructure**: Implement server-side ETL using Supabase Edge Functions with automatic scheduling and user-specific Xero data extraction.
* **Epic 3: Financial Dashboard Integration**: Integrate and display the specific, required financial dashboards from Xero, ensuring each role sees the correct visualizations.
* **Epic 4: Self-Service Xero Integration**: Empower users to securely connect their own Xero accounts, manage connections, and trigger data pipelines.
* **Epic 5: Work In Progress (WIP) Dashboard Integration**: Integrate data from Workflow Max / XPM to display a consolidated 'Work In Progress' dashboard.

## Epic 1: Foundation & Core Portal Setup
**Epic Goal**: To rebrand the existing PolicyAI application for BI Portal use, configure the database schema with role-based access, enhance authentication, and create a proof-of-concept for displaying a single, role-gated dashboard.

### Story 1.1: Rebrand and Configure Existing Project
**As a** developer, **I want** to rebrand the existing PolicyAI application and configure it for the BI Portal, **so that** I have a clean foundation connected to our new Supabase project.

#### Acceptance Criteria
1. All "PolicyAI" branding is updated to "BI Dashboard Portal" in visible UI components.
2. Legacy PolicyAI components (notebooks, chat) are preserved but not loaded in routing.
3. The application is successfully connected to the new Supabase project (jprwawlxjogdwhmorfpj).
4. The application runs locally without errors.
5. Environment variables are properly configured for the new Supabase project.

### Story 1.2: Create Database Migration for BI Portal Schema
**As a** developer, **I want** a complete database migration for the BI Portal schema, **so that** all required tables, RLS policies, and indexes are properly configured.

#### Acceptance Criteria
1. Migration file `20251015000001_create_bi_portal_schema.sql` is created in `supabase/migrations/`.
2. The `profiles` table has a new `role` column with check constraint ('admin', 'role_a', 'role_b').
3. New tables are created: `dashboards`, `dashboard_permissions`, `xero_connections`, `xero_data_cache`.
4. Row Level Security (RLS) is enabled on all new tables with appropriate policies.
5. Performance indexes are created on key columns.
6. Migration can be applied with `supabase db reset` locally and `supabase db push` remotely.

### Story 1.3: Enhance Authentication Context with Role Support
**As a** developer, **I want** the AuthContext to fetch and provide user roles, **so that** components can render based on user permissions.

#### Acceptance Criteria
1. `AuthContext.tsx` is enhanced to fetch user profile including role from the `profiles` table.
2. The context provides `user`, `profile`, `loading`, and `error` states.
3. Role information is available to all components via `useAuth()` hook.
4. Real-time updates are supported when profile data changes.

### Story 1.4: Enhance Protected Route with Role-Based Access
**As a** developer, **I want** ProtectedRoute to support role-based restrictions, **so that** certain routes are only accessible to specific roles.

#### Acceptance Criteria
1. `ProtectedRoute.tsx` accepts an optional `requiredRole` prop.
2. Users without the required role are redirected to the home page.
3. The route properly displays a loading state while checking authentication and role.
4. Unauthorized access attempts are logged for security monitoring.

### Story 1.5: Implement Basic Role-Gated Dashboard Display
**As an** admin, **I want** to see a single embedded dashboard when I log in, **so that** we can validate that the role-based access control is working.

#### Acceptance Criteria
1. When a user with the 'admin' role logs in, they are shown a page containing a single, hardcoded embedded Looker Studio dashboard.
2. When a user with any role other than 'admin' logs in, they see a message indicating "You do not have access to any dashboards at this time."
3. The embedded dashboard renders correctly in an iframe.
4. Dashboard loading states are displayed appropriately.

## Epic 2: Integrated ETL Infrastructure
**Epic Goal**: To implement server-side ETL using Supabase Edge Functions with automatic scheduling, enabling user-specific Xero data extraction with n8n as a fallback mechanism.

### Story 2.1: Implement Xero OAuth Edge Functions
**As a** developer, **I want** secure Edge Functions to handle Xero OAuth callbacks and token refreshes, **so that** refresh tokens are never exposed to the client.

#### Acceptance Criteria
1. Edge Function `xero-oauth-callback` is created in `supabase/functions/`.
2. The function exchanges authorization codes for access and refresh tokens.
3. Refresh tokens are encrypted using AES-256-GCM before storage.
4. The function stores connection data in the `xero_connections` table.
5. The function redirects users back to the frontend with connection status.
6. Edge Function `xero-refresh-token` is created to exchange refresh tokens for access tokens.
7. Token refresh is performed server-side only, never exposing refresh tokens.

### Story 2.2: Implement Xero ETL Edge Function
**As a** developer, **I want** an Edge Function that extracts data from Xero for all connected users, **so that** financial data is automatically updated daily.

#### Acceptance Criteria
1. Edge Function `xero-etl-extract` is created in `supabase/functions/`.
2. [cite_start]The function connects to the Xero API and extracts weekly income data from the 'HH Trust Regular Account' bank transactions[cite: 3].
3. [cite_start]The function extracts weekly 'Wages and Salaries' data (Account 500)[cite: 10].
4. [cite_start]The function extracts weekly 'Total Cost of Sales' and 'Total Operating Expenses' data[cite: 19].
5. [cite_start]The function applies a rolling 8-week average formula to the wages and expenses data[cite: 8, 19].
6. [cite_start]The function utilizes API calls: `GET /api.xro/2.0/BankTransactions`, `GET /api.xro/2.0/Accounts`, and `GET /api.xro/2.0/Reports/ProfitAndLoss`[cite: 4, 11, 21].
7. Extracted data is transformed and stored in the `xero_data_cache` table.
8. The function processes all connected users in a single execution.
9. Error handling is implemented with detailed logging for failures.

### Story 2.3: Configure Automated ETL Scheduling
**As an** admin, **I want** the ETL to run automatically every day, **so that** dashboard data is always current without manual intervention.

#### Acceptance Criteria
1. `pg_cron` extension is enabled in Supabase database.
2. A cron job is configured to run the `xero-etl-extract` function daily at 2 AM UTC.
3. The cron job is documented in the migration file for repeatability.
4. Execution logs are captured and accessible for monitoring.
5. Failed executions trigger alerts for admin review.

### Story 2.4: Implement Manual ETL Trigger
**As an** admin, **I want** a button to manually trigger data refresh, **so that** I can update dashboards on demand.

#### Acceptance Criteria
1. A "Refresh Data" button is available on the Settings page (admin only).
2. Clicking the button invokes the `xero-etl-extract` Edge Function.
3. A loading indicator is displayed during ETL execution.
4. Success/failure notifications are shown after completion.
5. The last refresh timestamp is displayed.

### Story 2.5: Configure n8n as Fallback ETL
**As an** admin, **I want** n8n configured as a backup ETL mechanism, **so that** data pipelines continue if Edge Functions fail.

#### Acceptance Criteria
1. An n8n workflow is configured with the same Xero API calls as the Edge Function.
2. The workflow can be manually triggered from the n8n UI.
3. The workflow writes to the same `xero_data_cache` table format.
4. Documentation explains when to use n8n vs. Edge Functions.
5. Alert mechanisms notify admins if Edge Functions fail 3+ consecutive times.

## Epic 3: Financial Dashboard Integration
**Epic Goal**: To integrate and display the specific, required financial dashboards from Xero, ensuring each role sees the correct visualizations from both Looker Studio and Power BI.

### Story 3.1: Implement 'Income vs Expenses' Dashboard
[cite_start]**As a** Role B user (Finance), **I want** to see the 'Income vs Expenses' dashboard, **so that** I can monitor the company's financial overview[cite: 2].
#### Acceptance Criteria
1. When a 'Role B' user logs in, the 'Income vs Expenses' dashboard is displayed.
2. [cite_start]The dashboard visualizes weekly income, an 8-week average of wages, and an 8-week average of total expenses[cite: 3, 5, 16].
3. Users with other roles cannot see this dashboard unless they are an Admin.

### Story 3.2: Implement 'Monthly Invoicing to Budget' Dashboard
[cite_start]**As a** Role A user (Sales), **I want** to see the 'Monthly Invoicing to Budget' dashboard, **so that** I can track sales performance against budget[cite: 22].
#### Acceptance Criteria
1. When a 'Role A' user logs in, the 'Monthly Invoicing to Budget' dashboard is displayed.
2. [cite_start]The dashboard correctly displays actual vs. budget 'Total Trading Income' on a monthly basis[cite: 23].
3. Users with other roles cannot see this dashboard unless they are an Admin.

### Story 3.3: Implement 'YTD/MTD Budget' View
[cite_start]**As a** Role A user (Sales), **I want** to toggle between a Year-to-Date and Month-to-Date budget view, **so that** I can analyze performance over different timeframes[cite: 27].
#### Acceptance Criteria
1. [cite_start]A widget is available on the portal with 'YTD' and 'MTD' selectors[cite: 29].
2. [cite_start]The widget displays 'Actual' vs 'Budget' data based on the selection, using the same data source as the 'Monthly Invoicing to Budget' dashboard[cite: 28].

### Story 3.4: Implement Comprehensive View for 'Admin' Role
**As an** admin, **I want** to see all financial dashboards, **so that** I have a complete overview of the business.
#### Acceptance Criteria
1. When a user with the 'admin' role logs in, they are shown a page containing all financial dashboards: 'Income vs Expenses', 'Monthly Invoicing to Budget', and the 'YTD/MTD' view.
2. The dashboards are clearly organized or sectioned by role/department.

## Epic 4: Self-Service Xero Integration
**Epic Goal**: To integrate data from Workflow Max / XPM to display a consolidated 'Work In Progress' dashboard for the entire firm. [cite_start]**Note**: Implementation is contingent on the release of the V2 JSON-based API from the vendor[cite: 32].

### Story 3.1: Develop WIP Data Extraction Workflow
**As an** admin, **I want** a data pipeline for WIP data, **so that** we can analyze unbilled work from Workflow Max.
#### Acceptance Criteria
1. An n8n workflow connects to the new Workflow Max V2 API.
2. [cite_start]The workflow extracts all necessary data from the 'Work in Progress' section[cite: 36].
3. Data is transformed and stored in a new Supabase table.

### Story 3.2: Implement 'WIP Analysis' Dashboard
**As an** admin, **I want** to see a firm-wide WIP dashboard, **so that** I can understand the value of unbilled work.
#### Acceptance Criteria
1. [cite_start]A new dashboard, showing WIP for the *entire firm*, is available in the portal[cite: 30].
2. [cite_start]The dashboard visualizes Unbilled WIP Days, broken down by aging categories (<30, 31-60, 61-90, 90+)[cite: 30].
3. The dashboard is visible only to 'Admin' users.



## Epic 4: Self-Service Xero Integration
**Epic Goal**: To empower users to securely connect their own Xero accounts to the platform, manage their connection, and trigger the data pipeline for their specific data.

### Story 4.1: Implement Xero OAuth 2.0 Connection UI
**As a** user, **I want** a simple wizard to guide me through connecting my Xero account, **so that** I can grant the application secure access to my data.
#### Acceptance Criteria
1. A "Connect to Xero" button is available in a new "Settings" or "Integrations" page.
2. Clicking the button initiates the Xero OAuth 2.0 flow.
3. The user is redirected to Xero to authorize the connection.
4. Upon successful authorization, the application securely stores the refresh token and tenant ID in a new xero_connections table in Supabase, associated with the user's profile.
5. The UI updates to show a "Connected" status with the associated Xero organization name.

### Story 4.2: Create Secure Server-Side Token Management
**As a** developer, **I want** secure server-side logic to handle Xero access tokens, **so that** user credentials are never exposed on the client.
#### Acceptance Criteria
1. A Supabase Edge Function is created to handle the OAuth callback from Xero.
2. The function exchanges the authorization code for an access token and refresh token.
3. Tokens are stored securely, encrypted at rest in the xero_connections table.
4. A separate Edge Function is created to handle token refreshes, ensuring persistent access to the Xero API.

### Story 4.3: Implement Connection Management UI
**As a** user, **I want** to see the status of my Xero connection and be able to disconnect it, **so that** I have full control over the integration.
#### Acceptance Criteria
1. The "Settings" or "Integrations" page displays the current Xero connection status and the connected organization.
2. A "Disconnect" button is available.
3. Clicking "Disconnect" revokes the token with Xero's API and deletes the connection record from the Supabase table.
4. The UI updates to show a "Not Connected" status.

## Epic 5: Work In Progress (WIP) Dashboard Integration
**Epic Goal**: To integrate data from Workflow Max / XPM to display a consolidated 'Work In Progress' dashboard for the entire firm. [cite_start]**Note**: Implementation is contingent on the release of the V2 JSON-based API from the vendor[cite: 32].

### Story 5.1: Develop WIP Data Extraction Workflow
**As an** admin, **I want** a data pipeline for WIP data, **so that** we can analyze unbilled work from Workflow Max.

#### Acceptance Criteria
1. An n8n workflow connects to the new Workflow Max V2 API.
2. [cite_start]The workflow extracts all necessary data from the 'Work in Progress' section[cite: 36].
3. Data is transformed and stored in a new Supabase table.

### Story 5.2: Implement 'WIP Analysis' Dashboard
**As an** admin, **I want** to see a firm-wide WIP dashboard, **so that** I can understand the value of unbilled work.

#### Acceptance Criteria
1. [cite_start]A new dashboard, showing WIP for the *entire firm*, is available in the portal[cite: 30].
2. [cite_start]The dashboard visualizes Unbilled WIP Days, broken down by aging categories (<30, 31-60, 61-90, 90+)[cite: 30].
3. The dashboard is visible only to 'Admin' users.
