import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { XeroConnectionWizard } from '@/components/xero/XeroConnectionWizard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Settings as SettingsIcon } from 'lucide-react';

const Settings: React.FC = () => {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your account and integration settings
          </p>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details and role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-sm text-gray-900 mt-1">{user?.email}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-gray-700">Role</label>
              <p className="text-sm text-gray-900 mt-1 capitalize">
                {role || 'No role assigned'}
              </p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-gray-700">User ID</label>
              <p className="text-xs text-gray-500 mt-1 font-mono">{user?.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Xero Integration */}
        <XeroConnectionWizard />

        {/* Additional Settings Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Configure how you receive notifications (Coming Soon)
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-500">
            Notification preferences will be available in a future update.
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
