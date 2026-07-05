/**
 * ProfilePage — view/update personal info (email read-only).
 * Logic unchanged (GET/PUT /api/users/me + localStorage sync); restyled + toasts.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, Mail, Calendar, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { LoaderPanel } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { initials } from '@/lib/utils';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/users/me');
        const data = res.data.data;
        setProfile(data); setFirstName(data.firstName); setLastName(data.lastName);
      } catch { toast.error('Failed to load profile'); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/api/users/me', { firstName, lastName });
      const updated = res.data.data;
      setProfile(updated);
      const current = getUser();
      localStorage.setItem('user', JSON.stringify({ ...current, firstName: updated.firstName, lastName: updated.lastName }));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  if (loading) return <LoaderPanel label="Loading profile…" />;

  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
          <Avatar className="h-20 w-20 text-xl ring-4 ring-border">
            <AvatarFallback className="text-xl">{initials(fullName, (profile?.email || 'U')[0].toUpperCase())}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-bold text-foreground">{fullName || 'Your account'}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            {profile?.role && <Badge className="mt-2"><Shield className="h-3 w-3" /> {profile.role}</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Personal information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fn">First name</Label>
                <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required minLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ln">Last name</Label>
                <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} required minLength={2} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="em">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="em" type="email" value={profile?.email || ''} disabled className="pl-10" />
              </div>
              <p className="text-xs text-muted-foreground">Email can't be changed.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms">Member since</Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="ms" value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : ''} disabled className="pl-10" />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
