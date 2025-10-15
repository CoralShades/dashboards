import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type XeroConnection = Database['public']['Tables']['xero_connections']['Row'];

export const useXeroConnection = () => {
  const { user } = useAuth();
  const [connection, setConnection] = useState<XeroConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('xero_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setConnection(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching Xero connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch connection');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const initiateOAuth = () => {
    // This will redirect to the Edge Function that handles OAuth
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/xero-oauth-callback`;
    window.location.href = functionUrl;
  };

  const disconnectXero = async () => {
    if (!connection) return;

    try {
      const { error } = await supabase
        .from('xero_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
    } catch (err) {
      console.error('Error disconnecting Xero:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
      throw err;
    }
  };

  const triggerETL = async () => {
    if (!connection) {
      throw new Error('No active Xero connection');
    }

    try {
      const { data, error } = await supabase.functions.invoke('xero-etl-extract', {
        body: { userId: user?.id }
      });

      if (error) throw error;

      // Refresh connection to get updated last_refreshed_at
      await fetchConnection();

      return data;
    } catch (err) {
      console.error('Error triggering ETL:', err);
      setError(err instanceof Error ? err.message : 'Failed to trigger ETL');
      throw err;
    }
  };

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return {
    connection,
    loading,
    error,
    initiateOAuth,
    disconnectXero,
    triggerETL,
    refetch: fetchConnection,
  };
};
