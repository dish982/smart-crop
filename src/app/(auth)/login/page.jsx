'use client';

export const dynamic = "force-dynamic";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-agri w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-green rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">
            🌾
          </div>
          <h1 className="text-2xl font-bold text-text-main">
            Welcome Back
          </h1>
          <p className="text-sm mt-1 text-text-subtle">
            Log in to access your crop advisory and market rates
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
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className="input-agri"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 text-lg py-3 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {/* Switch to Signup */}
        <div className="mt-6 text-center text-sm text-text-subtle">
          Don't have an account?{' '}
          <Link 
            href="/signup" 
            className="font-bold text-primary-green hover:underline"
          >
            Sign Up Here
          </Link>
        </div>
      </div>
    </div>
  );
}
