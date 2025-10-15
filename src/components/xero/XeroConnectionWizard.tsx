import React from 'react';
import { useXeroConnection } from '@/hooks/useXeroConnection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const XeroConnectionWizard: React.FC = () => {
  const { connection, loading, error, initiateOAuth, disconnectXero, refetch } = useXeroConnection();
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Xero account?')) {
      return;
    }

    setIsDisconnecting(true);
    try {
      await disconnectXero();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Xero Connection</CardTitle>
          <CardDescription>Loading connection status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xero Integration</CardTitle>
        <CardDescription>
          Connect your Xero account to automatically sync financial data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {connection ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Connected to Xero</p>
                <p className="text-sm text-green-700">
                  Tenant ID: {connection.tenant_id.substring(0, 8)}...
                </p>
                {connection.connected_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Connected: {new Date(connection.connected_at).toLocaleString()}
                  </p>
                )}
                {connection.last_refreshed_at && (
                  <p className="text-xs text-green-600">
                    Last synced: {new Date(connection.last_refreshed_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={refetch}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex-1"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                Your Xero data will be automatically synced every hour. You can also manually trigger
                a sync from the Dashboard page.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Not connected to Xero. Click below to authorize access to your Xero organization.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">What you'll be authorizing:</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Read financial data (Bank Transactions, Accounts, Profit & Loss)</li>
                <li>Access to your organization details</li>
                <li>Automatic data refresh every hour</li>
              </ul>
            </div>

            <Button
              onClick={initiateOAuth}
              className="w-full"
              size="lg"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect to Xero
            </Button>

            <p className="text-xs text-gray-500 text-center">
              You'll be redirected to Xero to authorize access. Your credentials are never stored on our servers.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
