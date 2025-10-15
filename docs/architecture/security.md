# Security Architecture

[← Back to Index](index.md)

---

## 5.2 Authentication & Authorization

### Authentication

* **Supabase Auth** will handle all authentication.
* **Sign-up/Sign-in:** Users will sign up using email and password (or OAuth providers if needed).
* **Session Management:** Supabase manages user sessions using JWTs.

### Authorization (Role-Based Access Control)

* **Roles:** Three roles are defined: `admin`, `editor`, and `viewer`.
* **Storage:** User roles are stored in the `profiles` table.
* **Enforcement:** Row-level security (RLS) policies in the database enforce access control based on roles.

### Row-Level Security (RLS) Policies

All RLS policies are defined in the database migration. Key policies include:

* **Profiles:**
  * Users can read their own profile
  * Admins can read all profiles
  * Users can update their own profile (except role)
  * Admins can insert and update any profile

* **Dashboards:**
  * Anyone can read dashboards (visibility controlled by permissions table)
  * Admins can create, update, and delete dashboards

* **Dashboard Permissions:**
  * Users can read their own permissions
  * Admins can read all permissions
  * Admins can grant and revoke permissions

* **Xero Connections:**
  * Users can manage their own connections
  * Admins can read all connections
  * Service role can manage all connections (for Edge Functions)

* **Xero Data Cache:**
  * Users can read their own tenant's data
  * Service role can manage all cache entries (for Edge Functions)

## 9. Security

### Token Encryption

Xero API tokens (access tokens and refresh tokens) are encrypted before storage using PostgreSQL's `pgcrypto` extension.

#### Database Functions for Encryption/Decryption

**File: `supabase/migrations/20241219_xero_token_encryption.sql`**

```sql
-- Create encryption/decryption functions using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encryption function
CREATE OR REPLACE FUNCTION public.encrypt_xero_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        pgp_sym_encrypt(
            token,
            current_setting('app.settings.encryption_key')
        ),
        'base64'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decryption function
CREATE OR REPLACE FUNCTION public.decrypt_xero_token(encrypted_token TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        decode(encrypted_token, 'base64'),
        current_setting('app.settings.encryption_key')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Environment Variables

Store the encryption key securely in Supabase secrets:

```bash
# Set the encryption key in Supabase
supabase secrets set ENCRYPTION_KEY="your-very-strong-encryption-key-here"
```

In your Edge Functions, access the key via:

```typescript
Deno.env.get('ENCRYPTION_KEY')
```

**Note:** Never commit encryption keys to version control. Use environment variables or Supabase secrets.

### API Security

* **Rate Limiting:** Supabase provides built-in rate limiting for API requests.
* **CORS:** Configure CORS headers in Edge Functions to restrict access to trusted domains.
* **HTTPS:** All API calls use HTTPS by default (enforced by Supabase).

### Data Security

* **RLS Policies:** All tables have RLS enabled to prevent unauthorized data access.
* **Service Role Key:** The service role key is used only in Edge Functions (server-side) and never exposed to the client.
* **Anon Key:** The anon key is safe to use in the frontend, as RLS policies enforce data access control.

### OAuth Security

* **State Parameter:** The OAuth flow uses a `state` parameter to prevent CSRF attacks.
* **Token Storage:** OAuth tokens are encrypted before storage.
* **Token Refresh:** Access tokens are automatically refreshed before expiration to maintain seamless access.

### Best Practices

1. **Never expose service role keys** in client-side code.
2. **Use environment variables** for all sensitive configuration.
3. **Enable MFA** for admin accounts.
4. **Regularly audit RLS policies** to ensure they align with access control requirements.
5. **Monitor API usage** for suspicious activity.
6. **Keep dependencies updated** to patch security vulnerabilities.
