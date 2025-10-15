# Supabase Edge Functions - Xero Integration

This directory contains the Supabase Edge Functions for the BI Dashboard Portal's integrated Xero ETL system.

## 🏗️ Architecture

**Primary ETL Method:** Supabase Edge Functions (this implementation)  
**Fallback ETL Method:** n8n workflows (manual trigger if Edge Functions fail)

## 📂 Functions Overview

### 1. `xero-oauth-callback`
**Purpose:** Handles the OAuth 2.0 callback from Xero after user authorization.

**Flow:**
1. Receives authorization code from Xero
2. Exchanges code for access + refresh tokens
3. Fetches Xero tenant (organization) information
4. Encrypts refresh token using AES-256-GCM
5. Stores encrypted token in `xero_connections` table
6. Redirects user back to frontend

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/xero-oauth-callback`

### 2. `xero-refresh-token`
**Purpose:** Server-side token refresh to keep refresh tokens secure.

**Flow:**
1. Receives `connection_id` from caller
2. Retrieves encrypted refresh token from database
3. Decrypts token
4. Exchanges refresh token for new access token
5. Returns fresh access token to caller

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/xero-refresh-token`  
**Method:** POST  
**Body:** `{ "connection_id": "uuid" }`

### 3. `xero-etl-extract`
**Purpose:** PRIMARY ETL process - extracts financial data from Xero for all connected users.

**Flow:**
1. Loads all active Xero connections
2. For each user:
   - Calls `xero-refresh-token` to get fresh access token
   - Calls Xero APIs (BankTransactions, Accounts, ProfitAndLoss)
   - Transforms data (calculates averages, extracts metrics)
   - UPSERTs to `xero_data_cache` table
3. Returns summary of successes/failures

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/xero-etl-extract`  
**Triggered by:**
- `pg_cron` (daily at 2 AM UTC)
- Manual admin trigger via frontend

## 🔐 Environment Variables Setup

### Step 1: Create `.env` file

```bash
cd supabase/functions
cp .env.example .env
```

### Step 2: Fill in values

Edit `.env` and add your actual values:

```bash
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
ENCRYPTION_KEY=your_32_character_key  # Generate with: openssl rand -base64 32
FRONTEND_URL=http://localhost:5173    # Or your production URL
```

### Step 3: Deploy secrets to Supabase

```bash
supabase secrets set --env-file supabase/functions/.env
```

Verify secrets were set:

```bash
supabase secrets list
```

## 🚀 Deployment

### Deploy all functions at once:

```bash
supabase functions deploy xero-oauth-callback
supabase functions deploy xero-refresh-token
supabase functions deploy xero-etl-extract
```

### Or deploy individually:

```bash
supabase functions deploy xero-oauth-callback
```

## 🧪 Local Development

### Start Supabase locally (requires Docker Desktop):

```bash
supabase start
```

### Serve functions locally:

```bash
supabase functions serve xero-oauth-callback --env-file supabase/functions/.env
```

### Test locally:

```bash
# Test token refresh
curl -X POST http://localhost:54321/functions/v1/xero-refresh-token \
  -H "Content-Type: application/json" \
  -d '{"connection_id": "uuid-here"}'

# Test ETL (requires existing connections)
curl -X POST http://localhost:54321/functions/v1/xero-etl-extract \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 📊 Monitoring & Logs

### View function logs:

```bash
# In Supabase Dashboard: Project > Edge Functions > [Function Name] > Logs

# Or via CLI:
supabase functions logs xero-etl-extract --tail
```

### Key metrics to monitor:

- **Success rate:** Number of users processed successfully
- **Error rate:** Failed ETL attempts per user
- **Execution time:** Average time per user
- **Token refresh failures:** Indicates expired Xero connections

## 🔧 Automated Scheduling (pg_cron)

The ETL function is automatically triggered daily via `pg_cron`. This is configured in the database migration:

```sql
-- Already applied in migration 20251015000001_create_bi_portal_schema.sql
SELECT cron.schedule(
  'xero-etl-daily',
  '0 2 * * *',  -- 2 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://jprwawlxjogdwhmorfpj.supabase.co/functions/v1/xero-etl-extract',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) as request_id;
  $$
);
```

### View scheduled jobs:

```sql
SELECT * FROM cron.job;
```

### View job history:

```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## 🛠️ Troubleshooting

### Function not found error:

```bash
# Redeploy the function
supabase functions deploy xero-oauth-callback
```

### Token refresh failing:

- Check if XERO_CLIENT_ID and XERO_CLIENT_SECRET are correct
- Verify user hasn't revoked access in Xero settings
- Check if refresh token is properly encrypted/decrypted

### ETL failing for all users:

- Check Supabase service role key is valid
- Verify all environment variables are set
- Check network connectivity to Xero APIs
- Review function logs for specific error messages

### OAuth callback not redirecting:

- Verify FRONTEND_URL environment variable
- Check Xero app settings have correct redirect URI: `https://[project-ref].supabase.co/functions/v1/xero-oauth-callback`

## 🔗 Related Documentation

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Xero OAuth 2.0 Guide](https://developer.xero.com/documentation/guides/oauth2/auth-flow)
- [Xero API Reference](https://developer.xero.com/documentation/api/accounting/overview)
- [Project Architecture Document](../../docs/architecture.md)
- [PRD Document](../../docs/prd.md)

## 📝 Notes

- TypeScript errors in VS Code are expected (Deno runtime, not Node)
- Functions use Deno's built-in `crypto` API for encryption
- All Xero tokens are encrypted at rest in the database
- RLS policies ensure users can only access their own data
- Service role key bypasses RLS for internal operations only
