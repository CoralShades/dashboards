# Centralized BI Dashboard Portal - Architecture Document

**Version:** 2.0  
**Date:** 2025-10-15  
**Author:** Winston (Architect) - Reviewed and Corrected  
**Previous Version:** 1.0 by Sarah (Product Owner)

---

## Document Structure

This architecture document is organized into the following sections:

1. [High-Level Architecture](high-level-architecture.md) - System components and their interactions
2. [Tech Stack](tech-stack.md) - Technologies and tools used in the project
3. [Data Models & Database Schema](data-models-database-schema.md) - Database tables and relationships
4. [API Specification](api-specification.md) - Edge Functions and API endpoints
5. [Security](security.md) - Authentication, authorization, and data protection
6. [Testing Strategy](testing-strategy.md) - Testing approach and coverage
7. [Development Workflow](development-workflow.md) - Development roadmap and phases
8. [Unified Project Structure](unified-project-structure.md) - File organization and component reusability

---

## 1. Introduction

This document outlines the technical architecture for the Centralized BI Dashboard Portal. Its purpose is to provide a comprehensive blueprint for development, ensuring that the system is scalable, secure, and aligns with the project's goals as defined in the PRD.

The system is designed to be a lightweight, secure web portal that provides role-based access to embedded business intelligence dashboards. It leverages a modern, serverless-first technology stack to ensure rapid development and maintainability.

### 1.1 Brownfield Project Context

**CRITICAL:** This is a **brownfield transformation project**, not a greenfield implementation.

**Existing Infrastructure:**
- **Source Codebase:** Repurposing an existing PolicyAI application
- **Tech Stack Already in Place:** React 18.3.1 + Vite + TypeScript + Supabase
- **UI Framework:** Shadcn UI components with Tailwind CSS (already configured)
- **Routing:** react-router-dom v6 (already implemented)
- **State Management:** React Context API + TanStack Query (already configured)
- **Authentication:** Supabase Auth with AuthContext provider (already implemented)

**Legacy PolicyAI Components to Preserve but NOT Use:**
- Database tables: `notebooks`, `sources`, `documents`, `n8n_chat_histories`, `studio_notes`
- Components: `src/components/notebook/`, `src/components/chat/`
- Hooks: `useNotebooks`, `useSources`, `useChatMessages`, `useDocumentProcessing`
- Pages: `Notebook.tsx` (current implementation)

**Reusable Infrastructure:**
- ✅ `src/components/auth/` - Authentication components
- ✅ `src/components/ui/` - Complete Shadcn UI component library
- ✅ `src/contexts/AuthContext.tsx` - Auth state management (needs enhancement)
- ✅ `src/integrations/supabase/client.ts` - Configured Supabase client
- ✅ `src/hooks/use-mobile.tsx`, `use-toast.ts`, `useIsDesktop.tsx`
- ✅ `src/lib/utils.ts` - Utility functions
- ✅ Base routing structure in `App.tsx`

**Supabase Environment:**
- **Status:** Newly linked Supabase project (jprwawlxjogdwhmorfpj.supabase.co)
- **Migrations Folder:** Empty (requires initial schema setup)
- **Edge Functions Folder:** Empty (requires new function creation)
- **Connection:** Configured via environment variables in `supabase-cred.md`

**Development Approach:**
This architecture will **leverage existing infrastructure** while adding new BI-specific tables, components, and features. We will NOT rebuild authentication, routing, or UI components from scratch.

---

## Document Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-15 | 2.0 | Major review and corrections: Added brownfield context, database migration strategy, integrated ETL architecture, Xero frontend wizard, component reusability matrix, enhanced routing | Winston (Architect) |
| 2025-10-15 | 1.0 | Initial draft | Sarah (Product Owner) |
