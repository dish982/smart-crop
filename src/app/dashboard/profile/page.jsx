'use client';

import { useEffect, useState } from 'react';
import { User as UserIcon, Pencil, Save, X, Loader2 } from 'lucide-react';

const LANGUAGE_LABELS = { en: 'English', hi: 'हिंदी (Hindi)', mr: 'मराठी (Marathi)' };

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', state: '', district: '', language: 'en' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const u = data.user || data;
        setUser(u);
        setForm({
          name: u?.name || '',
          state: u?.state || '',
          district: u?.district || '',
          language: u?.language || 'en',
        });
      })
      .catch(() => setError('Could not load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Update failed');
      setUser(data.user);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-green" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-green flex items-center gap-2">
          <UserIcon className="w-6 h-6" /> My Profile
        </h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-primary-green border border-primary-green px-3 py-1.5 rounded-lg hover:bg-primary-green/10 flex items-center gap-1"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-accent-cherry rounded-lg text-sm">{error}</div>
      )}

      <div className="bg-surface-card border border-border-light rounded-xl p-6 shadow-soft space-y-4">
        <Field label="Full Name" name="name" value={form.name} editing={editing} onChange={handleChange} />
        <Field label="Phone Number" value={user?.phone} editing={false} />
        <Field label="State" name="state" value={form.state} editing={editing} onChange={handleChange} />
        <Field label="District" name="district" value={form.district} editing={editing} onChange={handleChange} />

        <div>
          <p className="text-xs text-text-subtle uppercase tracking-wider font-semibold mb-1">Preferred Language</p>
          {editing ? (
            <select name="language" value={form.language} onChange={handleChange} className="input-agri">
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
            </select>
          ) : (
            <p className="text-text-main font-medium">{LANGUAGE_LABELS[form.language] || 'English'}</p>
          )}
        </div>

        {editing && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-green hover:bg-primary-green-hover text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-surface-muted border border-border-light rounded-lg text-sm font-semibold"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, value, editing, onChange }) {
  return (
    <div>
      <p className="text-xs text-text-subtle uppercase tracking-wider font-semibold mb-1">{label}</p>
      {editing && name ? (
        <input type="text" name={name} value={value} onChange={onChange} className="input-agri" />
      ) : (
        <p className="text-text-main font-medium">{value || '—'}</p>
      )}
    </div>
  );
}