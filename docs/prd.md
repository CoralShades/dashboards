# Centralized BI Dashboard Portal Product Requirements Document (PRD)

## Goals and Background Context

### Goals
* **Centralize BI Access**: Provide a single, user-friendly portal for all 20 team members to access BI dashboards.
* **Implement Role-Based Access Control**: Ensure users can only view dashboards and data relevant to their specific roles, eliminating unauthorized data access.
* **Automate Data Pipeline**: Maintain a fully automated and reliable daily data pipeline from Xero and Workflow Max to Supabase with greater than 99% uptime.
* **Ensure Future Flexibility**: Build an architecture that can simultaneously support embedded dashboards from both Google Looker Studio and Microsoft Power BI.

### Background Context
Our organization relies on key business data from Xero and Workflow Max, processed via an n8n workflow into a Supabase database, to make informed decisions. Currently, our growing team of 20 members lacks a centralized or secure method to access these BI dashboards, leading to fragmented access, inefficient permissions management, and potential data governance risks.

This project will create a scalable, secure portal that solves these issues by providing authenticated, role-based access to the correct set of dashboards, ensuring team members can efficiently access the insights they need while strengthening our data security posture.

### Change Log
| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2025-09-23 | 1.2 | Updated frontend framework from Next.js/React to Vue.js 3 to align with architecture document. | John (PM) |
| 2025-09-23 | 1.1 | Updated Epics and Stories with specific dashboard requirements from client document. | John (PM) |
| 2025-09-23 | 1.0 | Initial PRD draft based on Project Brief. | John (PM) |

## Requirements

### Functional
* **FR1**: The system must provide secure user authentication (registration, login, logout) using email and password, handled by Supabase Authentication.
* **FR2**: The main portal page must conditionally render a specific set of embedded dashboards based on the logged-in user's assigned role ('admin', 'role\_a', 'role\_b').
* **FR3**: The portal must support embedding reports via `<iframe>` from both Google Looker Studio and Microsoft Power BI.
* **FR4**: The system must utilize a Supabase database with a `profiles` table to link authenticated users to their roles.
* [cite_start]**FR5**: A daily automated n8n workflow must extract data from Xero and Workflow Max and load it into the Supabase database[cite: 3, 31].
* **FR6**: The application will be built using the Dashibase (Vue.js + Supabase) boilerplate to accelerate development.

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
The project will use a monorepo structure, as the Dashibase boilerplate provides a single, integrated Vue.js application.

### Service Architecture: Monolith (Serverless)
The project is a single Vue.js application that leverages Supabase for its backend services (Auth, Database), fitting a monolithic but serverless-first architectural pattern.

### Testing Requirements: Unit + Integration
Testing will focus on unit tests for critical logic (e.g., role-gating) and integration tests to ensure reliable connections to Supabase and the data pipeline.

### Additional Technical Assumptions and Requests
* **UI Boilerplate**: Dashibase will be used to accelerate development.
* **Frontend Framework**: Vue.js 3 with Vite.
* **Backend & Authentication**: Supabase.
* **Data Automation (ETL)**: n8n.
* [cite_start]**Primary Data Source**: Xero, Workflow Max / XPM[cite: 3, 31].
* **BI Tools**: Google Looker Studio and Microsoft Power BI.
* **Deployment**: Vercel or Netlify.

## Epic List

* **Epic 1: Foundation & Core Portal Setup**: Establish the project foundation, configure the financial data pipeline from Xero, and implement user authentication and role-based access.
* **Epic 2: Financial Dashboard Integration**: Integrate and display the specific, required financial dashboards from Xero, ensuring each role sees the correct visualizations.
* **Epic 3: Work In Progress (WIP) Dashboard Integration**: Integrate data from Workflow Max / XPM to display a consolidated 'Work In Progress' dashboard.

## Epic 1: Foundation & Core Portal Setup
**Epic Goal**: To establish the foundational infrastructure of the application, including project setup from the boilerplate, a functional data pipeline for Xero financials, user authentication, and a proof-of-concept for displaying a single, role-gated dashboard.

### Story 1.1: Setup Project from Dashibase Boilerplate
**As a** developer, **I want** to set up the initial project structure using the Dashibase boilerplate, **so that** I have a working foundation connected to our Supabase instance.
#### Acceptance Criteria
1. The Dashibase GitHub repository is successfully cloned.
2. All required dependencies are installed.
3. The local project is successfully connected to the designated Supabase project.
4. The application runs locally without errors.

### Story 1.2: Configure n8n Data Pipeline for Financials
**As an** admin, **I want** the n8n workflow to be fully configured, **so that** financial data is automatically extracted from Xero and loaded into the Supabase database daily.
#### Acceptance Criteria
1. [cite_start]The n8n workflow connects to the Xero API and extracts weekly income data from the 'HH Trust Regular Account' bank transactions[cite: 3].
2. [cite_start]The workflow extracts weekly 'Wages and Salaries' data (Account 500)[cite: 10].
3. [cite_start]The workflow extracts weekly 'Total Cost of Sales' and 'Total Operating Expenses' data[cite: 19].
4. [cite_start]The workflow applies a rolling 8-week average formula to the wages and expenses data[cite: 8, 19].
5. [cite_start]The n8n workflow utilizes API calls similar to `GET /api.xro/2.0/BankTransactions`, `GET /api.xro/2.0/Accounts`, and `GET /api.xro/2.0/Reports/ProfitAndLoss` where appropriate[cite: 4, 11, 21].
6. The workflow is scheduled to run automatically once every 24 hours.

### Story 1.3: Implement User Authentication
**As a** team member, **I want** to be able to register for an account and log in securely, **so that** I can access the BI portal.
#### Acceptance Criteria
1. A user can create a new account using their email and a password.
2. A registered user can log in with their credentials.
3. A logged-in user can log out of the application.
4. All authentication is handled by the Supabase Auth service.

### Story 1.4: Create User Profiles and Roles Table
**As a** developer, **I want** a `profiles` table in Supabase, **so that** I can associate authenticated users with their specific access roles.
#### Acceptance Criteria
1. A table named `profiles` is created in the Supabase database.
2. The table links the `id` from `auth.users` to a user profile.
3. The table contains a `role` column of type `text` (e.g., 'admin', 'role\_a', 'role\_b').
4. Row Level Security (RLS) is enabled.

### Story 1.5: Implement Basic Role-Gated Dashboard Display
**As an** admin, **I want** to see a single embedded dashboard when I log in, **so that** we can validate that the role-based access control is working.
#### Acceptance Criteria
1. When a user with the 'admin' role logs in, they are shown a page containing a single, hardcoded embedded Looker Studio dashboard.
2. When a user with any role other than 'admin' logs in, they see a message indicating "You do not have access to any dashboards at this time."
3. The embedded dashboard renders correctly.

## Epic 2: Financial Dashboard Integration
**Epic Goal**: To integrate and display the specific, required financial dashboards from Xero, ensuring each role sees the correct visualizations from both Looker Studio and Power BI.

### Story 2.1: Implement 'Income vs Expenses' Dashboard
[cite_start]**As a** Role B user (Finance), **I want** to see the 'Income vs Expenses' dashboard, **so that** I can monitor the company's financial overview[cite: 2].
#### Acceptance Criteria
1. When a 'Role B' user logs in, the 'Income vs Expenses' dashboard is displayed.
2. [cite_start]The dashboard visualizes weekly income, an 8-week average of wages, and an 8-week average of total expenses[cite: 3, 5, 16].
3. Users with other roles cannot see this dashboard unless they are an Admin.

### Story 2.2: Implement 'Monthly Invoicing to Budget' Dashboard
[cite_start]**As a** Role A user (Sales), **I want** to see the 'Monthly Invoicing to Budget' dashboard, **so that** I can track sales performance against budget[cite: 22].
#### Acceptance Criteria
1. When a 'Role A' user logs in, the 'Monthly Invoicing to Budget' dashboard is displayed.
2. [cite_start]The dashboard correctly displays actual vs. budget 'Total Trading Income' on a monthly basis[cite: 23].
3. Users with other roles cannot see this dashboard unless they are an Admin.

### Story 2.3: Implement 'YTD/MTD Budget' View
[cite_start]**As a** Role A user (Sales), **I want** to toggle between a Year-to-Date and Month-to-Date budget view, **so that** I can analyze performance over different timeframes[cite: 27].
#### Acceptance Criteria
1. [cite_start]A widget is available on the portal with 'YTD' and 'MTD' selectors[cite: 29].
2. [cite_start]The widget displays 'Actual' vs 'Budget' data based on the selection, using the same data source as the 'Monthly Invoicing to Budget' dashboard[cite: 28].

### Story 2.4: Implement Comprehensive View for 'Admin' Role
**As an** admin, **I want** to see all financial dashboards, **so that** I have a complete overview of the business.
#### Acceptance Criteria
1. When a user with the 'admin' role logs in, they are shown a page containing all financial dashboards: 'Income vs Expenses', 'Monthly Invoicing to Budget', and the 'YTD/MTD' view.
2. The dashboards are clearly organized or sectioned by role/department.

## Epic 3: Work In Progress (WIP) Dashboard Integration
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


