# Project Brief: Centralized BI Dashboard Portal

**Date:** September 23, 2025
**Version:** 1.0

---

## 1. Context & Problem Statement

### 1.1. Context
Our organization relies on key business data from Xero to make informed decisions. This data is currently being extracted and transformed via an n8n automation workflow and stored in a Supabase Postgres database. We have a growing team of approximately 20 members across different departments, each requiring access to specific sets of data visualizations. We intend to use a mix of **Google Looker Studio** and **Microsoft Power BI** for creating these visualizations.

### 1.2. Problem Statement
Currently, there is no centralized, secure, or scalable method for team members to access these crucial business intelligence dashboards. The lack of a single portal leads to fragmented access, creates challenges in managing permissions, and makes it difficult to ensure that users only view data relevant to their specific roles. As the team and the number of dashboards grow, this manual approach to access control is inefficient and poses a potential data governance risk.

---

## 2. Target Users

The portal will serve internal team members, segmented into three initial roles:

### Admin
*(e.g., Leadership, Operations Heads)*
> **Needs:** Requires a comprehensive, high-level view of all business data across all departments. Needs to ensure the system is functional and secure.
>
> **Pain Points:** Lacks a single place to see the full business picture.

### Role A
*(e.g., Sales & Marketing Team)*
> **Needs:** Requires access to dashboards related to sales performance, customer acquisition, marketing campaign ROI, and lead funnels.
>
> **Pain Points:** Has to request specific reports or navigate multiple links to get performance data.

### Role B
*(e.g., Finance & HR Team)*
> **Needs:** Requires access to dashboards focused on financial health, profit and loss (P&L), cash flow, and employee metrics.
>
> **Pain Points:** Cannot easily access up-to-date financial reports without manual data pulls or direct database queries.

---

## 3. Goals & Success Metrics

The primary goal is to create a secure, scalable, and user-friendly portal for all internal BI needs.

| Goal                                 | Success Metric                                                                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Centralize BI Access**             | 100% of the 20 target users are actively using the portal as their primary method for accessing dashboards within one month of launch.      |
| **Implement Role-Based Access Control** | Zero reported incidents of users accessing data or dashboards not assigned to their role.                                                 |
| **Automate Data Pipeline**           | Data in all dashboards is consistently refreshed daily from Xero via the n8n pipeline with >99% uptime and no manual intervention.          |
| **Ensure Future Flexibility**        | The portal architecture successfully supports the simultaneous embedding of dashboards from both **Looker Studio** and **Power BI**. |

---

## 4. MVP Scope (Minimum Viable Product)

The initial version of the portal will focus on delivering core functionality to validate the architecture and provide immediate value to the team.

### 4.1. In-Scope Features

- **User Authentication:**
    - Secure user registration, login, and logout functionality using email and password.
    - Handled via **Supabase Authentication**.

- **Role-Based Dashboard Access:**
    - A main portal page that conditionally renders the correct set of embedded dashboards based on the logged-in user's assigned role.
    - Support for embedding reports via `<iframe>` from both **Looker Studio** and **Power BI**.

- **Data Backend & Pipeline:**
    - A fully functional **n8n** workflow that automates the daily extraction of data from **Xero** and loads it into the **Supabase** database.
    - A **Supabase** database schema that includes a `profiles` table linking authenticated users to their roles (e.g., 'admin', 'role_a', 'role_b').

- **Foundation:**
    - The application will be built using the **Dashibase** (**Next.js** + **Supabase**) boilerplate to accelerate development.

### 4.2. Out-of-Scope for MVP

- **In-App User Management:** Admins will manage user roles directly within the Supabase table for the MVP. A UI for this will be a future enhancement.
- **Self-Serve Role Requests:** Users cannot request role changes from within the app.
- **Advanced In-App Filtering:** All data filtering will be handled within the BI tools themselves. The portal's job is to display the correct report, not to filter its content.
- **Real-time Data Streaming:** A daily data refresh is sufficient for the MVP.

---

## 5. Technology Stack

- **Frontend Framework:** Next.js (React)
- **UI Boilerplate:** Dashibase
- **Backend & Authentication:** Supabase (Auth, Postgres Database)
- **Data Automation (ETL):** n8n
- **Primary Data Source:** Xero
- **BI & Visualization Tools:** Google Looker Studio (Free Tier), Microsoft Power BI
- **Deployment Platform:** Vercel or Netlify
