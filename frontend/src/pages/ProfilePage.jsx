/**
 * WHY this page exists:
 *   Users can view and update their profile (name, email is read-only).
 *
 * HOW it differs from Next.js:
 *   No Next.js imports needed — same logic, just no 'use client' directive.
 */

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/users/me');
      const data = response.data.data;
      setProfile(data);
      setFirstName(data.firstName);
      setLastName(data.lastName);
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      const response = await api.put('/api/users/me', { firstName, lastName });
      const updated = response.data.data;
      setProfile(updated);
      const currentUser = getUser();
      localStorage.setItem('user', JSON.stringify({ ...currentUser, firstName: updated.firstName, lastName: updated.lastName }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">

      <div>
        <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your personal information</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4 pb-6 border-b border-gray-200 mb-6">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-brand-700">
              {profile?.firstName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{profile?.firstName} {profile?.lastName}</p>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
              {profile?.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h3>

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-700">Profile updated successfully!</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required minLength={2} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required minLength={2} className="input-field" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input type="email" value={profile?.email || ''} disabled className="input-field opacity-60 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed in Phase 1.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member since</label>
            <input type="text" value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : ''} disabled className="input-field opacity-60 cursor-not-allowed" />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
