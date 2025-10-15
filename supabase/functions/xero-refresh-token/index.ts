/**
 * Xero Token Refresh Handler
 * 
 * Server-side function to refresh Xero access tokens using stored refresh tokens.
 * This ensures refresh tokens are never exposed to the client.
 * 
 * Expected Request Body:
 * {
 *   "connection_id": "uuid" // ID of the xero_connections record
 * }
 * 
 * Response:
 * {
 *   "access_token": "string",
 *   "expires_in": number
 * }
 * 
 * Environment Variables Required:
 * - XERO_CLIENT_ID
 * - XERO_CLIENT_SECRET
 * - ENCRYPTION_KEY (32 characters)
 * - SUPABASE_URL (pre-populated)
 * - SUPABASE_SERVICE_ROLE_KEY (pre-populated)
 */

import { createClient } from "npm:@supabase/supabase-js@2.49.0";
import { decryptToken } from "../_shared/encryption.ts";

console.info("xero-refresh-token function started");

interface RefreshTokenRequest {
  connection_id: string;
}

interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

Deno.serve(async (req: Request) => {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { connection_id }: RefreshTokenRequest = await req.json();

    if (!connection_id) {
      return new Response(
        JSON.stringify({ error: "connection_id is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.info(`Refreshing token for connection: ${connection_id}`);

    // Create Supabase client with service role (bypasses RLS for internal operations)
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

    // Retrieve encrypted refresh token from database
    const { data: connection, error: connError } = await supabase
      .from("xero_connections")
      .select("*")
      .eq("id", connection_id)
      .single();

    if (connError) {
      console.error("Database error:", connError);
      throw new Error(`Failed to fetch connection: ${connError.message}`);
    }

    if (!connection) {
      throw new Error("Connection not found");
    }

    // Decrypt the stored refresh token
    const refreshToken = await decryptToken(
      connection.encrypted_refresh_token,
      Deno.env.get("ENCRYPTION_KEY")!
    );

    console.info("Exchanging refresh token for new access token");

    // Exchange refresh token for new access token
    const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(
          `${Deno.env.get("XERO_CLIENT_ID")}:${Deno.env.get("XERO_CLIENT_SECRET")}`
        )}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token refresh failed:", errorData);
      throw new Error(`Token refresh failed: ${tokenResponse.status}`);
    }

    const tokens: XeroTokenResponse = await tokenResponse.json();
    console.info("Token refresh successful");

    // Update last_refreshed_at timestamp
    const { error: updateError } = await supabase
      .from("xero_connections")
      .update({ 
        last_refreshed_at: new Date().toISOString()
      })
      .eq("id", connection_id);

    if (updateError) {
      console.warn("Failed to update last_refreshed_at:", updateError);
      // Non-critical error, continue
    }

    // Return new access token to caller
    return new Response(
      JSON.stringify({
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Connection": "keep-alive"
        },
      }
    );

  } catch (error) {
    console.error("Token refresh error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Token refresh failed"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
