
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/components/theme-provider';
import { apiClient } from '@/lib/apiClient';

interface MeState { _id?: string; fullName?: string; email?: string; profilepic?: string; department?: string | null }


const placeholderUser: MeState = { fullName: 'Loading...', email: '', profilepic: undefined };

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [me, setMe] = useState<MeState>(placeholderUser);
  // local flags (expand later for profile edits)
  const [saving, setSaving] = useState(false);
  const [picPreview, setPicPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pwMessage, setPwMessage] = useState<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiClient.getMe();
        if (mounted) setMe(data);
      } catch (e) {
        if (mounted) setMe({ fullName: 'Unknown', email: 'N/A' });
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);
    if (!passwords.current || !passwords.new) return setPwMessage('Fill all fields');
    if (passwords.new !== passwords.confirm) return setPwMessage('Passwords do not match');
    try {
      await apiClient.changeMyPassword({ currentPassword: passwords.current, newPassword: passwords.new });
      setPwMessage('Password updated');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      setPwMessage(err?.message || 'Update failed');
    }
  }

  async function handleProfilePicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview
    const url = URL.createObjectURL(file);
    setPicPreview(url);
    setSaving(true);
    try {
      await apiClient.updateMyProfile({ profilepicFile: file });
      // Refresh me
      const data = await apiClient.getMe();
      setMe(data);
    } catch (err) {
      // simple revert
      setPwMessage('Profile picture update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-screen px-4 py-8 overflow-x-hidden  transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className=''>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account, password, and preferences</p>
        </div>

       
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="w-20 h-20 text-2xl bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-500/30">
                {picPreview ? (
                  <img src={picPreview} alt="Preview" className="rounded-full w-full h-full object-cover" />
                ) : me.profilepic ? (
                  <img
                    src={(() => {
                      if (/^(http|data:)/.test(me.profilepic)) return me.profilepic;
                      const base = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
                      // If base ends with /api strip for static asset root
                      const root = base.replace(/\/api$/i, '');
                      return `${root}/${me.profilepic.replace(/^\/+/, '')}`;
                    })()}
                    alt={me.fullName}
                    className="rounded-full w-full h-full object-cover" />
                ) : (
                  <span>{(me.fullName || 'U').charAt(0)}</span>
                )}
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 text-white text-xs rounded-full transition"
              >
                {saving ? 'Uploading...' : 'Change'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePicChange}
                className="hidden"
              />
            </div>
            <div>
              <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">{me.fullName}</div>
              <div className="text-gray-500 dark:text-gray-400">{me.email}</div>
              <div className="mt-2 text-xs text-muted-foreground">Click avatar to update picture</div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={saving}>{saving ? 'Saving...' : 'Edit Profile'}</Button>
          </CardFooter>
        </Card>

        {/* Password Card */}
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Set a new password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <Input type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <Input type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <Input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              {pwMessage && <div className="text-xs text-muted-foreground">{pwMessage}</div>}
              <Button type="submit" className="mt-2" disabled={saving}>Update Password</Button>
            </form>
          </CardContent>
        </Card>

        {/* Theme Card */}
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Choose your preferred appearance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>Light</Button>
              <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>Dark</Button>
              <Button variant={theme === 'system' ? 'default' : 'outline'} onClick={() => setTheme('system')}>System</Button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Current: <span className="font-medium">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
