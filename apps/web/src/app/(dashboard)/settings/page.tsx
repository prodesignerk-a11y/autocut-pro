'use client';

import { useState, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, Mail, Shield, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [email] = useState(session?.user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setIsSavingProfile(true);
    // TODO: Call API to update profile
    await new Promise((r) => setTimeout(r, 1000));
    toast.success('Profile updated');
    setIsSavingProfile(false);
  }

  async function handlePasswordSave(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsSavingPassword(true);
    // TODO: Call API to update password
    await new Promise((r) => setTimeout(r, 1000));
    toast.success('Password updated');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsSavingPassword(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User size={16} className="text-primary-400" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Update your display name and avatar</CardDescription>
        </CardHeader>

        <form onSubmit={handleProfileSave} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">
                {(session?.user?.name?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{session?.user?.name}</p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-surface-muted border border-surface-border text-gray-400 rounded-lg px-4 py-2.5 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-gray-600 mt-1">Email cannot be changed</p>
          </div>

          <Button type="submit" size="sm" isLoading={isSavingProfile}>
            Save Profile
          </Button>
        </form>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary-400" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>

        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              className="w-full bg-surface-muted border border-surface-border text-white placeholder-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              minLength={8}
              required
              className="w-full bg-surface-muted border border-surface-border text-white placeholder-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
              className="w-full bg-surface-muted border border-surface-border text-white placeholder-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
            />
          </div>

          <Button type="submit" size="sm" variant="secondary" isLoading={isSavingPassword}>
            Update Password
          </Button>
        </form>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-red-400" />
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
          </div>
          <CardDescription>Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Delete Account</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Permanently delete your account and all associated data
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => toast.error('Account deletion requires contacting support')}
          >
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
