# Technology Stack

[← Back to Index](index.md)

---

## 3. Technology Stack

| Category             | Technology                        | Status     |
| -------------------- | --------------------------------- | ---------- |
| Frontend Framework   | React (v18+)                      | ✅ ACTUAL  |
| Build Tool           | Vite (v5+)                        | ✅ ACTUAL  |
| UI Library           | shadcn/ui (Radix UI + Tailwind)   | ✅ ACTUAL  |
| Styling              | Tailwind CSS                      | ✅ ACTUAL  |
| Language             | TypeScript                        | ✅ ACTUAL  |
| Backend Framework    | Supabase (PostgreSQL + Auth)      | ✅ ACTUAL  |
| ETL Tool (Primary)   | **Supabase Edge Functions**       | ✅ ACTUAL  |
| ETL Tool (Fallback)  | n8n Cloud                         | ✅ ACTUAL  |
| Deployment (Frontend)| Vercel or Netlify                 | ✅ ACTUAL  |
| Deployment (Backend) | Supabase Cloud                    | ✅ ACTUAL  |
| Version Control      | Git + GitHub                      | ✅ ACTUAL  |

### Rationale

* **React + Vite:** Fast build times, modern tooling, excellent developer experience. Widely adopted and supported.
* **shadcn/ui:** Provides high-quality, accessible components that can be customized and owned by the project (copy-paste approach).
* **TypeScript:** Adds type safety, reducing bugs and improving maintainability.
* **Supabase:** Combines PostgreSQL (relational database), Auth (user management), and serverless functions (Edge Functions) in a single, managed service. This simplifies infrastructure and provides an excellent developer experience.
* **Supabase Edge Functions (Primary ETL):** Enables running TypeScript/JavaScript code close to the database for secure and efficient data processing. Eliminates the need for external ETL services for most use cases.
* **n8n (Fallback ETL):** Provides a visual workflow editor for low-code ETL tasks. Will be used only if Edge Functions become insufficient or for specific complex transformations.
* **Vercel/Netlify:** One-click deployment, global CDN, excellent for React SPAs.

### Key Stack Notes

* **Corrected Architecture:** This architecture uses **Supabase Edge Functions as the primary ETL mechanism**, not n8n. n8n is retained only as a fallback option for complex workflows.
* **Brownfield Integration:** The stack leverages the existing Supabase project (`iapzzmgrnydjwzrpxgnv.supabase.co`). All code will be added to the existing repository.
* **Token Encryption:** Xero API tokens will be encrypted using the `pg_crypto` extension in PostgreSQL for enhanced security.
* **Scheduled ETL:** The `pg_cron` extension will be used to schedule regular data extraction from Xero (e.g., daily runs).
