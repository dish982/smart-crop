'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, X } from 'lucide-react';

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirm: '',
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    message: '',
    error: false,
  });

  const [showPasswordRules, setShowPasswordRules] = useState(false);

  const passwordValidations = {
    minLength: formData.newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.newPassword),
    hasLowercase: /[a-z]/.test(formData.newPassword),
    hasDigit: /[0-9]/.test(formData.newPassword),
  };

  const isPasswordValid =
    Object.values(passwordValidations).every(Boolean);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setStatus({
      message: '',
      error: false,
    });

    if (!isPasswordValid) {
      setStatus({
        message: 'Please fulfill all password requirements.',
        error: true,
      });
      return;
    }

    if (formData.newPassword !== formData.confirm) {
      setStatus({
        message: 'Passwords do not match.',
        error: true,
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({
          message: data.error || 'Something went wrong',
          error: true,
        });
      } else {
        setStatus({
          message: 'Password reset! Redirecting to login...',
          error: false,
        });

        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch {
      setStatus({
        message: 'Network error. Please try again.',
        error: true,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card-agri w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-text-main mb-2">
            Invalid Reset Link
          </h1>

          <p className="text-sm text-text-subtle mb-4">
            This link is missing required information or has expired.
          </p>

          <Link
            href="/forgot-password"
            className="font-bold text-primary-green hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-agri w-full max-w-md">

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-green rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">
            🔒
          </div>

          <h1 className="text-2xl font-bold text-text-main">
            Reset Password
          </h1>

          <p className="text-sm mt-1 text-text-subtle">
            Choose a new password for your account
          </p>
        </div>

        {status.message && (
          <div
            className={`mb-5 p-3 rounded-md text-sm border-l-4 ${
              status.error
                ? 'bg-red-50 border-accent-cherry text-accent-cherry'
                : 'bg-emerald-50 border-emerald-500 text-emerald-700'
            }`}
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-semibold mb-1 text-text-main">
              New Password{' '}
              <span className="text-accent-cherry">*</span>
            </label>

            <input
              type="password"
              name="newPassword"
              required
              placeholder="Create a strong password"
              value={formData.newPassword}
              onChange={handleChange}
              onFocus={() => setShowPasswordRules(true)}
              className="input-agri"
            />

            {(showPasswordRules ||
              formData.newPassword.length > 0) && (
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

          <div>
            <label className="block text-sm font-semibold mb-1 text-text-main">
              Confirm New Password{' '}
              <span className="text-accent-cherry">*</span>
            </label>

            <input
              type="password"
              name="confirm"
              required
              placeholder="Re-enter new password"
              value={formData.confirm}
              onChange={handleChange}
              className="input-agri"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordValid}
            className="btn-primary w-full mt-2 text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>

        </form>
      </div>
    </div>
  );
}

function ValidationRule({ isValid, text }) {
  return (
    <div
      className={`flex items-center gap-2 transition-colors duration-200 ${
        isValid
          ? 'text-emerald-600 font-medium'
          : 'text-text-subtle'
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