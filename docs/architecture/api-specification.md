# API Specification (Edge Functions)

[← Back to Index](index.md)

---

## 5.3 Serverless Functions (Edge Functions)

Supabase Edge Functions will handle sensitive operations that should not be exposed to the client (e.g., OAuth token exchange, API calls to Xero).

### Required Edge Functions

1. **`xero-oauth-callback`:** Handles the OAuth callback from Xero, exchanges the authorization code for tokens, and stores the encrypted tokens in the database.
2. **`xero-refresh-token`:** Refreshes the Xero access token when it expires.
3. **`xero-etl-extract`:** Extracts data from Xero and loads it into the `xero_data_cache` table.

## 6. Data & ETL Architecture

### 6.1 Primary ETL: Supabase Edge Functions

The **primary mechanism** for ETL will be **Supabase Edge Functions** combined with **PostgreSQL's `pg_cron` extension**. This approach keeps all data processing within the Supabase ecosystem, reducing external dependencies.

#### ETL Flow

1. **Scheduled Trigger:** A `pg_cron` job is scheduled to run daily (e.g., at 2:00 AM UTC).
2. **Invoke Edge Function:** The cron job calls the `xero-etl-extract` Edge Function.
3. **Token Refresh:** The Edge Function checks if the Xero access token has expired. If so, it calls the `xero-refresh-token` function.
4. **Data Extraction:** The Edge Function makes authenticated requests to the Xero API to fetch financial data (invoices, contacts, accounts, reports).
5. **Data Loading:** The extracted data is stored in the `xero_data_cache` table in JSONB format.
6. **Logging:** All operations are logged for monitoring and debugging.

#### Edge Function: `xero-etl-extract`

**File: `supabase/functions/xero-etl-extract/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface XeroConnection {
  id: string
  tenant_id: string
  access_token: string
  refresh_token: string
  expires_at: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get all active Xero connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('xero_connections')
      .select('*')
      .returns<XeroConnection[]>()

    if (connectionsError) throw connectionsError

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No Xero connections found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const results = []

    // 2. Process each connection
    for (const connection of connections) {
      try {
        // 2.1 Check if token is expired
        const expiresAt = new Date(connection.expires_at)
        const now = new Date()

        let accessToken = connection.access_token

        if (expiresAt <= now) {
          // Token expired - refresh it
          const { data: refreshData, error: refreshError } = await supabaseClient.functions.invoke(
            'xero-refresh-token',
            {
              body: { connection_id: connection.id }
            }
          )

          if (refreshError) throw refreshError
          accessToken = refreshData.access_token
        }

        // 2.2 Decrypt token (using pgcrypto in a database function)
        const { data: decryptedToken, error: decryptError } = await supabaseClient.rpc(
          'decrypt_xero_token',
          { encrypted_token: accessToken }
        )

        if (decryptError) throw decryptError

        // 2.3 Extract data from Xero API
        const dataTypes = ['invoices', 'contacts', 'accounts']
        
        for (const dataType of dataTypes) {
          const xeroData = await fetchXeroData(connection.tenant_id, decryptedToken, dataType)
          
          // 2.4 Upsert data into cache
          const { error: upsertError } = await supabaseClient
            .from('xero_data_cache')
            .upsert({
              tenant_id: connection.tenant_id,
              data_type: dataType,
              data: xeroData,
              last_synced: new Date().toISOString()
            }, {
              onConflict: 'tenant_id,data_type'
            })

          if (upsertError) throw upsertError
        }

        results.push({
          tenant_id: connection.tenant_id,
          status: 'success',
          message: 'Data extracted and cached successfully'
        })

      } catch (connectionError) {
        results.push({
          tenant_id: connection.tenant_id,
          status: 'error',
          message: connectionError.message
        })
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function fetchXeroData(tenantId: string, accessToken: string, dataType: string) {
  const xeroApiUrl = `https://api.xero.com/api.xro/2.0/${dataType}`
  
  const response = await fetch(xeroApiUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Xero API error: ${response.statusText}`)
  }

  return await response.json()
}
```

#### Scheduling with pg_cron

To schedule the ETL function to run daily:

```sql
-- Enable pg_cron extension (Supabase has this enabled by default)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the xero-etl-extract function to run daily at 2:00 AM UTC
SELECT cron.schedule(
    'xero-daily-etl',
    '0 2 * * *',
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/xero-etl-extract',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
        ),
        body := '{}'::jsonb
    );
    $$
);
```

**Note:** Replace `YOUR_PROJECT_ID` and `YOUR_SERVICE_ROLE_KEY` with actual values from your Supabase project.

### 6.2 Fallback ETL: n8n Cloud

If Edge Functions prove insufficient for complex data transformations, an n8n workflow can be used as a fallback. The n8n workflow would:

1. Authenticate with Xero using OAuth 2.0.
2. Extract data from Xero (invoices, contacts, accounts, reports).
3. Transform the data as needed.
4. Load the data into the `xero_data_cache` table using Supabase's REST API.

**Note:** This is a **secondary option** and should only be implemented if Edge Functions cannot meet the requirements.

## 7. Integration Architecture

### 7.1 Xero API Integration

#### 7.1.1 OAuth 2.0 Flow

The application will use Xero's OAuth 2.0 (Authorization Code Grant) flow to obtain access tokens.

**Frontend: Connection Wizard Component**

**File: `src/components/settings/XeroConnectionWizard.tsx`**

```tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useXeroConnection } from '@/hooks/useXeroConnection'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export const XeroConnectionWizard: React.FC = () => {
  const { initiateConnection, connectionStatus, error } = useXeroConnection()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    await initiateConnection()
    setIsConnecting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect to Xero</CardTitle>
        <CardDescription>
          Link your Xero account to enable automated data synchronization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus === 'disconnected' && (
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Xero Account
          </Button>
        )}

        {connectionStatus === 'connected' && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span>Successfully connected to Xero</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Custom Hook: `useXeroConnection`**

**File: `src/hooks/useXeroConnection.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

type ConnectionStatus = 'connected' | 'disconnected' | 'checking'

export const useXeroConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setConnectionStatus('disconnected')
        return
      }

      const { data, error: queryError } = await supabase
        .from('xero_connections')
        .select('id, expires_at')
        .eq('user_id', user.id)
        .single()

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          setConnectionStatus('disconnected')
        } else {
          throw queryError
        }
        return
      }

      const expiresAt = new Date(data.expires_at)
      const now = new Date()

      if (expiresAt > now) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('disconnected')
      }
    } catch (err) {
      console.error('Error checking Xero connection:', err)
      setError('Failed to check connection status')
      setConnectionStatus('disconnected')
    }
  }

  const initiateConnection = async () => {
    try {
      setError(null)

      // Build OAuth URL
      const clientId = import.meta.env.VITE_XERO_CLIENT_ID
      const redirectUri = `${window.location.origin}/xero/callback`
      const scope = 'openid profile email accounting.transactions accounting.contacts accounting.settings offline_access'
      const state = crypto.randomUUID()

      // Store state in localStorage for verification
      localStorage.setItem('xero_oauth_state', state)

      const authUrl = new URL('https://login.xero.com/identity/connect/authorize')
      authUrl.searchParams.append('response_type', 'code')
      authUrl.searchParams.append('client_id', clientId)
      authUrl.searchParams.append('redirect_uri', redirectUri)
      authUrl.searchParams.append('scope', scope)
      authUrl.searchParams.append('state', state)

      // Redirect to Xero
      window.location.href = authUrl.toString()
    } catch (err) {
      console.error('Error initiating Xero connection:', err)
      setError('Failed to start connection process')
    }
  }

  const disconnectXero = async () => {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: deleteError } = await supabase
        .from('xero_connections')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      setConnectionStatus('disconnected')
    } catch (err) {
      console.error('Error disconnecting Xero:', err)
      setError('Failed to disconnect')
    }
  }

  return {
    connectionStatus,
    error,
    initiateConnection,
    disconnectXero,
    checkConnection
  }
}
```

#### 7.1.2 OAuth Callback Handler (Edge Function)

**File: `supabase/functions/xero-oauth-callback/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, state } = await req.json()

    // 1. Verify state (optional but recommended)
    // In a real app, you'd store the state in a secure session store

    // 2. Exchange code for tokens
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${Deno.env.get('XERO_CLIENT_ID')}:${Deno.env.get('XERO_CLIENT_SECRET')}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: Deno.env.get('XERO_REDIRECT_URI') ?? ''
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const tokens = await tokenResponse.json()

    // 3. Get tenant information
    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!connectionsResponse.ok) {
      throw new Error('Failed to fetch Xero connections')
    }

    const connections = await connectionsResponse.json()
    const tenant = connections[0] // Use the first tenant

    // 4. Get authenticated user
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Not authenticated')

    // 5. Encrypt tokens using pgcrypto
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: encryptedAccessToken, error: encryptAccessError } = await serviceClient.rpc(
      'encrypt_xero_token',
      { token: tokens.access_token }
    )

    const { data: encryptedRefreshToken, error: encryptRefreshError } = await serviceClient.rpc(
      'encrypt_xero_token',
      { token: tokens.refresh_token }
    )

    if (encryptAccessError || encryptRefreshError) {
      throw new Error('Failed to encrypt tokens')
    }

    // 6. Store connection in database
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { error: upsertError } = await serviceClient
      .from('xero_connections')
      .upsert({
        user_id: user.id,
        tenant_id: tenant.tenantId,
        tenant_name: tenant.tenantName,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt
      }, {
        onConflict: 'user_id,tenant_id'
      })

    if (upsertError) throw upsertError

    return new Response(
      JSON.stringify({ success: true, tenant_name: tenant.tenantName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```
