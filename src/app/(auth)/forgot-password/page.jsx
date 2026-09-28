'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: '', error: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ message: '', error: false });
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ message: data.error || 'Something went wrong', error: true });
      } else {
        setStatus({ message: data.message, error: false });
      }
    } catch {
      setStatus({ message: 'Network error. Please try again.', error: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-agri w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-green rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">
            🔑
          </div>
          <h1 className="text-2xl font-bold text-text-main">Forgot Password</h1>
          <p className="text-sm mt-1 text-text-subtle">
            Enter the email linked to your account and we'll send you a reset link
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
              Email <span className="text-accent-cherry">*</span>
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-agri"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 text-lg py-3 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-text-subtle">
          Remembered your password?{' '}
          <Link href="/login" className="font-bold text-primary-green hover:underline">
            Log In Here
          </Link>
        </div>
      </div>
    </div>
  );
}