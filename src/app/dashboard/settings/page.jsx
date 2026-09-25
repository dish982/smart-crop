"use client";
import { useEffect, useState } from "react";
import { Globe, Save, CheckCircle, Loader2 } from "lucide-react";

const LANGUAGE_LABELS = { en: 'English', hi: 'हिंदी (Hindi)', mr: 'मराठी (Marathi)' };

export default function SettingsPage() {
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setSelectedLanguage(data.language || 'en');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Save preference error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-text-main">Settings</h1>

        <p className="text-sm text-text-subtle mt-1">
          Manage system preferences and regional settings.
        </p>
      </div>

      <div className="bg-surface-card border border-border-light rounded-2xl p-6 shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-light pb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl mt-0.5">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-main">Preferred Language</h2>
              <p className="text-xs text-text-subtle mt-1">
                Currently set to: <span className="font-semibold text-text-main">{LANGUAGE_LABELS[selectedLanguage]}</span>
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              className="w-full bg-surface-muted border border-border-light text-text-main text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary-green cursor-pointer font-medium"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <CheckCircle className="w-4 h-4" /> Preferences saved successfully!
            </span>
          ) : <span />}

          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 py-2.5 px-5 bg-primary-green hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}