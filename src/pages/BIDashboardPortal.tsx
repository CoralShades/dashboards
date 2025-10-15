import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart3, AlertCircle, RefreshCw } from 'lucide-react';
import { XeroDataRefreshButton } from '@/components/xero/XeroDataRefreshButton';
import type { Database } from '@/integrations/supabase/types';

type Dashboard = Database['public']['Tables']['dashboards']['Row'];

const BIDashboardPortal: React.FC = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && role) {
      fetchDashboards();
    }
  }, [user, role, authLoading]);

  const fetchDashboards = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboards accessible by user's role via permissions table
      const { data, error } = await supabase
        .from('dashboard_permissions')
        .select('dashboard_id, dashboards(id, name, embed_url, bi_tool)')
        .eq('role', role);

      if (error) throw error;

      // Extract dashboard objects from the join
      const dashboardList = data
        ?.filter(item => item.dashboards)
        .map(item => item.dashboards)
        .filter((d): d is Dashboard => d !== null) || [];

      setDashboards(dashboardList);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboards');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              BI Dashboard Portal
            </h1>
            <p className="text-gray-600 mt-1">
              Your role: <span className="font-medium capitalize">{role}</span>
            </p>
          </div>
          <XeroDataRefreshButton />
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Dashboard Grid */}
        {dashboards.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Dashboards Available</CardTitle>
              <CardDescription>
                There are no dashboards configured for your role ({role}).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Contact your administrator to set up dashboards for your role.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {dashboards.map((dashboard) => (
              <Card key={dashboard.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle>{dashboard.name}</CardTitle>
                  <CardDescription>
                    BI Tool: {dashboard.bi_tool.charAt(0).toUpperCase() + dashboard.bi_tool.slice(1)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {dashboard.embed_url ? (
                    <div className="relative w-full" style={{ height: '600px' }}>
                      <iframe
                        src={dashboard.embed_url}
                        className="absolute inset-0 w-full h-full border-0"
                        title={dashboard.name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      />
                    </div>
                  ) : (
                    <div className="p-6 bg-gray-50 text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        This dashboard has no embed URL configured.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              Having trouble viewing your dashboards?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• Make sure your Xero account is connected in Settings</p>
            <p>• Try refreshing your Xero data using the button above</p>
            <p>• Contact support if dashboards are not loading correctly</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BIDashboardPortal;
