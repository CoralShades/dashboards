# Unified Project Structure

The project will use a pragmatic monorepo structure that evolves the existing codebase by adding a `shared` directory for common code like TypeScript types.

```plaintext
policy-ai-app/
├── src/                  # The React SPA frontend (existing)
├── supabase/             # Supabase-specific code (existing)
├── n8n/                  # N8N workflows (existing)
├── shared/               # NEW: For shared code
│   └── src/
│       └── types.ts
├── docs/
└── package.json
```
