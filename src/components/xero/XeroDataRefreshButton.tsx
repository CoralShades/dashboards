import React, { useState } from 'react';
import { useXeroConnection } from '@/hooks/useXeroConnection';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const XeroDataRefreshButton: React.FC = () => {
  const { connection, triggerETL } = useXeroConnection();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!connection) {
      toast({
        title: 'Not Connected',
        description: 'Please connect your Xero account first.',
        variant: 'destructive',
      });
      return;
    }

    setIsRefreshing(true);
    try {
      await triggerETL();
      toast({
        title: 'Sync Started',
        description: 'Your Xero data is being refreshed. This may take a minute.',
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync Xero data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!connection) {
    return (
      <Button variant="outline" disabled>
        <AlertCircle className="h-4 w-4 mr-2" />
        Xero Not Connected
      </Button>
    );
  }

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing}
      variant="outline"
    >
      {isRefreshing ? (
        <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Refresh Xero Data
        </>
      )}
    </Button>
  );
};
