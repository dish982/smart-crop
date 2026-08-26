'use client';

import { handleLogout } from '@/app/actions/auth';
import { LogOut } from 'lucide-react';

export default function LogoutButton({ className = '' }) {
  return (
    <form action={handleLogout}>
      <button
        type="submit"
        title="Log Out"
        className={className}
      >
        <LogOut className="w-5 h-5" />
      </button>
    </form>
  );
}