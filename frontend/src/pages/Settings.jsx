import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMe, updateMe } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Settings as SettingsIcon, User, Phone, DollarSign, Image as ImageIcon } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    currency: 'INR',
    profile_image_url: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getMe();
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          currency: data.currency || 'INR',
          profile_image_url: data.profile_image_url || ''
        });
      } catch (err) {
        addToast({ title: 'Error', message: 'Failed to load profile', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [addToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateMe(profile);
      addToast({ title: 'Success', message: 'Profile updated successfully', type: 'success' });
    } catch (err) {
      addToast({ title: 'Error', message: 'Failed to update profile', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">Settings</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Manage your account settings and preferences.
        </p>
      </header>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm max-w-2xl">
        <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Profile Settings</h2>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6">
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-[var(--color-text-primary)]">Email Address</label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] opacity-70 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Your email address cannot be changed.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="full_name" className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                  <User className="h-4 w-4" /> Full Name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={profile.full_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text-primary)]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text-primary)]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="currency" className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Default Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={profile.currency}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text-primary)]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="profile_image_url" className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> Profile Avatar URL
                </label>
                <div className="flex gap-4 items-start">
                  {profile.profile_image_url ? (
                    <img 
                      src={profile.profile_image_url} 
                      alt="Avatar preview" 
                      className="h-12 w-12 rounded-full object-cover border border-[var(--color-border)]"
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = 'https://ui-avatars.com/api/?name=User&background=random';
                      }}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-[var(--color-border)] flex items-center justify-center border border-[var(--color-border)]">
                      <User className="h-6 w-6 text-[var(--color-text-secondary)]" />
                    </div>
                  )}
                  <input
                    id="profile_image_url"
                    name="profile_image_url"
                    type="url"
                    value={profile.profile_image_url}
                    onChange={handleChange}
                    placeholder="https://example.com/avatar.jpg"
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-[var(--color-border)] flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
