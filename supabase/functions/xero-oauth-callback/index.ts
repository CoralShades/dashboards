/**
 * Xero OAuth 2.0 Callback Handler
 * 
 * Handles the OAuth callback from Xero after user authorization:
 * 1. Exchanges authorization code for access/refresh tokens
 * 2. Retrieves Xero tenant (organization) ID
 * 3. Encrypts refresh token using AES-256-GCM
 * 4. Stores encrypted token in xero_connections table
 * 5. Redirects user back to frontend with success/error status
 * 
 * Environment Variables Required:
 * - XERO_CLIENT_ID
 * - XERO_CLIENT_SECRET
 * - ENCRYPTION_KEY (32 characters)
 * - SUPABASE_URL (pre-populated)
 * - SUPABASE_SERVICE_ROLE_KEY (pre-populated)
 */

import { createClient } from "npm:@supabase/supabase-js@2.49.0";
import { encryptToken } from "../_shared/encryption.ts";

console.info("xero-oauth-callback function started");

interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface XeroConnection {
  id: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
  createdDateUtc: string;
  updatedDateUtc: string;
}

Deno.serve(async (req: Request) => {
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
  
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Check for OAuth errors from Xero
    if (error) {
      console.error("Xero OAuth error:", error);
      return Response.redirect(
        `${frontendUrl}/settings?xero=error&message=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      throw new Error("No authorization code provided");
    }

    console.info("Processing OAuth callback with code");

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(
          `${Deno.env.get("XERO_CLIENT_ID")}:${Deno.env.get("XERO_CLIENT_SECRET")}`
        )}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/xero-oauth-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokens: XeroTokenResponse = await tokenResponse.json();
    console.info("Token exchange successful");

    // Get Xero tenant (organization) information
    const connectionsResponse = await fetch(
      "https://api.xero.com/connections",
      {
        headers: {
          "Authorization": `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!connectionsResponse.ok) {
      throw new Error(`Failed to fetch Xero connections: ${connectionsResponse.status}`);
    }

    const connections: XeroConnection[] = await connectionsResponse.json();
    
    if (!connections || connections.length === 0) {
      throw new Error("No Xero organization found for this account");
    }

    const tenant = connections[0];
    console.info(`Connected to Xero org: ${tenant.tenantName}`);

    // Encrypt refresh token for secure storage
    const encryptedToken = await encryptToken(
      tokens.refresh_token,
      Deno.env.get("ENCRYPTION_KEY")!
    );

    // Extract user ID from session cookie
    // The user must be authenticated to reach this callback
    const authHeader = req.headers.get("Cookie");
    
    // Create Supabase client with service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get user from auth cookie
    const cookieHeader = req.headers.get("Cookie") || "";
    const authToken = cookieHeader
      .split(";")
      .find((c) => c.trim().startsWith("sb-access-token="))
      ?.split("=")[1];

    if (!authToken) {
      throw new Error("User not authenticated - no session cookie found");
    }

    // Verify the user session
    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);

    if (userError || !user) {
      console.error("User authentication failed:", userError);
      throw new Error("User not authenticated");
    }

    console.info(`Storing connection for user: ${user.id}`);

    // Store connection in database with RLS policies
    const { error: dbError } = await supabase
      .from("xero_connections")
      .upsert({
        user_id: user.id,
        tenant_id: tenant.tenantId,
        encrypted_refresh_token: encryptedToken,
        organization_name: tenant.tenantName,
        connected_at: new Date().toISOString(),
      }, {
        onConflict: "user_id", // Replace existing connection if user reconnects
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to store connection: ${dbError.message}`);
    }

    console.info("Connection stored successfully");

    // Redirect back to frontend with success status
    return Response.redirect(`${frontendUrl}/settings?xero=connected&org=${encodeURIComponent(tenant.tenantName)}`);

  } catch (error) {
    console.error("OAuth callback error:", error);
    
    return Response.redirect(
      `${frontendUrl}/settings?xero=error&message=${encodeURIComponent(error.message)}`
    );
  }
});
