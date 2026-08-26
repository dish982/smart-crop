'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    state: '',
    district: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // track if password field is focused 
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  // Real-time password criteria verification
  const passwordValidations = {
    minLength: formData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.password),
    hasLowercase: /[a-z]/.test(formData.password),
    hasDigit: /[0-9]/.test(formData.password),
  };

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Secondary submit check for safety
    if (!isPasswordValid) {
      setError('Please fulfill all password requirements before signing up.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-agri w-full max-w-md my-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-green rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">
            🌱
          </div>
          <h1 className="text-2xl font-bold text-text-main">
            Create Farmer Account
          </h1>
          <p className="text-sm mt-1 text-text-subtle">
            Get instant crop advisories, market rates, and disease diagnostics
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-md text-sm border-l-4 bg-red-50 border-accent-cherry text-accent-cherry">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-text-main">
              Full Name <span className="text-accent-cherry">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              className="input-agri"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-text-main">
              Phone Number <span className="text-accent-cherry">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              required
              placeholder="Enter 10-digit mobile number"
              value={formData.phone}
              onChange={handleChange}
              className="input-agri text-lg"
              minLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-text-main">
              Password <span className="text-accent-cherry">*</span>
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setShowPasswordRules(true)}
              className="input-agri"
            />

            {/* Password Validation Rules Checklist */}
            {(showPasswordRules || formData.password.length > 0) && (
            <div className="mt-3 p-3 bg-surface-muted rounded-lg border border-border-light space-y-1.5 text-xs">
              <p className="font-semibold text-text-subtle mb-1">
                Password requirements:
              </p>
              
              <ValidationRule 
                isValid={passwordValidations.minLength} 
                text="At least 8 characters" 
              />
              <ValidationRule 
                isValid={passwordValidations.hasUppercase} 
                text="At least one uppercase letter (A-Z)" 
              />
              <ValidationRule 
                isValid={passwordValidations.hasLowercase} 
                text="At least one lowercase letter (a-z)" 
              />
              <ValidationRule 
                isValid={passwordValidations.hasDigit} 
                text="At least one number (0-9)" 
              />
            </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-sm font-semibold mb-1 text-text-subtle">
                State <span className="text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                name="state"
                placeholder="e.g. Maharashtra"
                value={formData.state}
                onChange={handleChange}
                className="input-agri"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-text-subtle">
                District <span className="text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                name="district"
                placeholder="e.g. Nashik"
                value={formData.district}
                onChange={handleChange}
                className="input-agri"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordValid}
            className="btn-primary w-full mt-3 text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        {/* Switch to Login */}
        <div className="mt-6 text-center text-sm text-text-subtle">
          Already have an account?{' '}
          <Link 
            href="/login" 
            className="font-bold text-primary-green hover:underline"
          >
            Log In Here
          </Link>
        </div>
      </div>
    </div>
  );
}

// Sub-component for rendering individual validation status line
function ValidationRule({ isValid, text }) {
  return (
    <div 
      className={`flex items-center gap-2 transition-colors duration-200 ${
        isValid ? 'text-emerald-600 font-medium' : 'text-text-subtle'
      }`}
    >
      {isValid ? (
        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      ) : (
        <X className="w-3.5 h-3.5 text-text-subtle opacity-50 shrink-0" />
      )}
      <span>{text}</span>
    </div>
  );
}