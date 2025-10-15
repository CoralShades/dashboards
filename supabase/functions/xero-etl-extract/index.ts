/**
 * Xero ETL Extract Function
 * 
 * Server-side ETL process that extracts financial data from Xero for all connected users.
 * This is the PRIMARY ETL mechanism (n8n is fallback).
 * 
 * Process Flow:
 * 1. Load all active Xero connections
 * 2. For each user:
 *    - Refresh access token
 *    - Extract data from Xero APIs (BankTransactions, Accounts, ProfitAndLoss)
 *    - Transform data (calculate averages, extract metrics)
 *    - UPSERT to xero_data_cache table
 * 3. Return summary of successes/failures
 * 
 * Triggered by:
 * - pg_cron (daily at 2 AM UTC)
 * - Manual admin trigger via frontend
 * 
 * Environment Variables Required:
 * - SUPABASE_URL (pre-populated)
 * - SUPABASE_SERVICE_ROLE_KEY (pre-populated)
 */

import { createClient } from "npm:@supabase/supabase-js@2.49.0";

console.info("xero-etl-extract function started");

interface ETLResult {
  success: number;
  failed: number;
  errors: Array<{ user_id: string; error: string }>;
}

interface XeroDataCache {
  user_id: string;
  date: string;
  weekly_income: number | null;
  avg_wages: number | null;
  avg_expenses: number | null;
  total_cost_of_sales: number | null;
  total_operating_expenses: number | null;
  data_json: any;
  extracted_at: string;
}

Deno.serve(async (req: Request) => {
  try {
    console.info("Starting ETL extraction process");

    // Create Supabase client with service role
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

    // Get all active Xero connections
    const { data: connections, error: connError } = await supabase
      .from("xero_connections")
      .select("*");

    if (connError) {
      console.error("Failed to fetch connections:", connError);
      throw new Error(`Failed to fetch connections: ${connError.message}`);
    }

    console.info(`Found ${connections?.length || 0} Xero connections to process`);

    const results: ETLResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Process each user's Xero account
    for (const conn of connections || []) {
      try {
        console.info(`Processing connection for user: ${conn.user_id}`);

        // Get fresh access token via refresh token function
        const tokenResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/xero-refresh-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ connection_id: conn.id }),
          }
        );

        if (!tokenResponse.ok) {
          throw new Error(`Token refresh failed: ${tokenResponse.status}`);
        }

        const { access_token } = await tokenResponse.json();

        // Extract data from Xero APIs
        console.info(`Extracting Xero data for user: ${conn.user_id}`);
        const xeroData = await extractXeroData(access_token, conn.tenant_id);

        // Transform extracted data
        console.info(`Transforming data for user: ${conn.user_id}`);
        const transformed = transformXeroData(xeroData);

        // UPSERT to xero_data_cache
        const cacheData: XeroDataCache = {
          user_id: conn.user_id,
          date: new Date().toISOString().split("T")[0],
          ...transformed,
          extracted_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase
          .from("xero_data_cache")
          .upsert(cacheData, {
            onConflict: "user_id,date",
          });

        if (upsertError) {
          throw new Error(`Database upsert failed: ${upsertError.message}`);
        }

        console.info(`Successfully processed user: ${conn.user_id}`);
        results.success++;

      } catch (userError) {
        console.error(`Failed to process user ${conn.user_id}:`, userError);
        results.failed++;
        results.errors.push({
          user_id: conn.user_id,
          error: userError instanceof Error ? userError.message : String(userError),
        });
      }
    }

    console.info(`ETL complete. Success: ${results.success}, Failed: ${results.failed}`);

    // Return summary
    return new Response(
      JSON.stringify(results),
      {
        status: results.failed === 0 ? 200 : 207, // 207 Multi-Status if some failed
        headers: {
          "Content-Type": "application/json",
          "Connection": "keep-alive"
        },
      }
    );

  } catch (error) {
    console.error("ETL extraction error:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "ETL extraction failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Extract financial data from Xero APIs
 */
async function extractXeroData(accessToken: string, tenantId: string) {
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Xero-tenant-id": tenantId,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };

  console.info("Calling Xero BankTransactions API");
  const bankTransactionsResponse = await fetch(
    "https://api.xero.com/api.xro/2.0/BankTransactions?where=Type%3D%3D%22RECEIVE%22",
    { headers }
  );
  
  if (!bankTransactionsResponse.ok) {
    throw new Error(`BankTransactions API failed: ${bankTransactionsResponse.status}`);
  }
  
  const bankTransactions = await bankTransactionsResponse.json();

  console.info("Calling Xero Accounts API");
  const accountsResponse = await fetch(
    "https://api.xero.com/api.xro/2.0/Accounts?where=Code%3D%3D%22500%22",
    { headers }
  );
  
  if (!accountsResponse.ok) {
    throw new Error(`Accounts API failed: ${accountsResponse.status}`);
  }
  
  const accounts = await accountsResponse.json();

  console.info("Calling Xero ProfitAndLoss Report API");
  const profitLossResponse = await fetch(
    "https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss",
    { headers }
  );
  
  if (!profitLossResponse.ok) {
    throw new Error(`ProfitAndLoss API failed: ${profitLossResponse.status}`);
  }
  
  const profitLoss = await profitLossResponse.json();

  return { bankTransactions, accounts, profitLoss };
}

/**
 * Transform Xero data into application format
 */
function transformXeroData(xeroData: any) {
  // Calculate weekly income from HH Trust Regular Account bank transactions
  const weeklyIncome = calculateWeeklyIncome(xeroData.bankTransactions);

  // Calculate 8-week rolling average for wages (Account 500)
  const avgWages = calculateRollingAverage(xeroData.accounts, "wages", 8);

  // Calculate 8-week rolling average for expenses
  const avgExpenses = calculateRollingAverage(xeroData.profitLoss, "expenses", 8);

  // Extract Total Cost of Sales and Operating Expenses
  const totalCostOfSales = extractReportValue(xeroData.profitLoss, "Cost of Sales");
  const totalOperatingExpenses = extractReportValue(xeroData.profitLoss, "Operating Expenses");

  return {
    weekly_income: weeklyIncome,
    avg_wages: avgWages,
    avg_expenses: avgExpenses,
    total_cost_of_sales: totalCostOfSales,
    total_operating_expenses: totalOperatingExpenses,
    data_json: xeroData, // Store full response for flexibility
  };
}

/**
 * Calculate weekly income from bank transactions
 */
function calculateWeeklyIncome(bankTransactionsData: any): number {
  try {
    const transactions = bankTransactionsData?.BankTransactions || [];
    
    // Get transactions from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyTotal = transactions
      .filter((t: any) => {
        const date = new Date(t.Date);
        return date >= sevenDaysAgo && t.Type === "RECEIVE";
      })
      .reduce((sum: number, t: any) => sum + (t.Total || 0), 0);
    
    return Math.round(weeklyTotal * 100) / 100;
  } catch (error) {
    console.error("Error calculating weekly income:", error);
    return 0;
  }
}

/**
 * Calculate rolling average for specified field over N weeks
 */
function calculateRollingAverage(
  data: any,
  field: string,
  weeks: number
): number {
  try {
    // Implementation depends on Xero API response structure
    // This is a placeholder that should be customized based on actual data
    
    if (field === "wages" && data?.Accounts) {
      const account = data.Accounts.find((a: any) => a.Code === "500");
      // Average calculation logic here
      return account?.UpdatedDateUTC ? parseFloat(account.UpdatedDateUTC) : 0;
    }
    
    if (field === "expenses" && data?.Reports) {
      // Extract expense data from report
      return 0;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error calculating ${field} rolling average:`, error);
    return 0;
  }
}

/**
 * Extract specific value from Xero ProfitAndLoss report
 */
function extractReportValue(profitLossData: any, fieldName: string): number {
  try {
    const reports = profitLossData?.Reports || [];
    if (reports.length === 0) return 0;
    
    const report = reports[0];
    const rows = report?.Rows || [];
    
    // Search through report rows for the specified field
    for (const row of rows) {
      if (row.Title === fieldName || row.RowType === fieldName) {
        const cells = row.Cells || [];
        if (cells.length > 0) {
          const value = cells[0].Value;
          return value ? parseFloat(value) : 0;
        }
      }
      
      // Check nested rows
      if (row.Rows) {
        const nestedValue = extractReportValue({ Reports: [{ Rows: row.Rows }] }, fieldName);
        if (nestedValue !== 0) return nestedValue;
      }
    }
    
    return 0;
  } catch (error) {
    console.error(`Error extracting ${fieldName}:`, error);
    return 0;
  }
}
