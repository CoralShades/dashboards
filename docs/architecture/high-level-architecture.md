# High Level Architecture

* **Technical Summary:** The architecture for PolicyAi is a serverless, full-stack application leveraging Supabase and N8N. The frontend is a React SPA communicating via Supabase Edge Functions with backend N8N workflows that handle the specialized RAG pipeline. This reuses the "InsightsLM" foundation while extending it with a robust, role-based security model enforced by Postgres Row Level Security.
* **Platform:** Supabase (backend) & Vercel/Netlify (frontend).
* **Repository Structure:** Monorepo, to simplify dependency management and ensure consistency.

## High Level Architecture Diagram
```mermaid
graph TD
    subgraph "User's Browser"
        A[React SPA on Vercel/Netlify]
    end

    subgraph "Supabase Platform"
        B[Edge Functions API]
        C[Authentication]
        D[Storage]
        E[Postgres DB with RLS]
        F[Vector Store]
    end

    subgraph "N8N Cloud"
        G[RAG Ingestion Workflow]
        H[Chat Workflow]
    end

    A -- "Signs In" --> C
    A -- "Uploads Policy" --> D
    A -- "Asks Question" --> B
    
    D -- "On Upload Trigger" --> G
    B -- "Invokes Chat" --> H

    G -- "Extracts Metadata & Chunks" --> E
    G -- "Creates Embeddings" --> F

    H -- "Queries with User Role" --> F
    H -- "Retrieves Chat History" --> E
    H -- "Returns Cited Answer" --> A
```
