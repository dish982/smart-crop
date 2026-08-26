export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/auth/LogoutButton';
import jwt from 'jsonwebtoken';
import { 
  LayoutDashboard, 
  Sprout, 
  ScanSearch, 
  TrendingUp, 
  User, 
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Crop Advisory', href: '/dashboard/crop-advisory', icon: Sprout },
  { name: 'Disease Detection', href: '/dashboard/disease-detect', icon: ScanSearch },
  { name: 'Market Prices', href: '/dashboard/mandi-prices', icon: TrendingUp },
  { name: 'Profile', href: '/dashboard/farmer-details', icon: User },
];

export default async function DashboardLayout({ children }) {
  // 1. Server-side Cookie Verification
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token');

  if (!token) {
    redirect('/login');
  }

  let user = {
    name: 'Farmer User',
    state: '',
    role: 'Farmer',
  };

  try {
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET);
    
    user = {
      name: decoded.name || 'Farmer User',
      state: decoded.state || '',
      role: decoded.role || 'Farmer',
    };
  } catch (err) {
    redirect('/login');
  }

  const initialLetter = user.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-bg-cream text-text-main flex flex-col md:flex-row">

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-64 bg-surface-card border-r border-border-light flex-col justify-between p-4 sticky top-0 h-screen shadow-soft">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-border-light">
            <div className="p-2 bg-surface-muted rounded-xl border border-border-light">
              <Sprout className="w-6 h-6 text-primary-green" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-primary-green leading-tight">Smart Crop</h1>
              <p className="text-xs text-text-subtle">Advisory System</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-text-main hover:bg-surface-muted hover:text-primary-green transition-all group"
                >
                  <IconComponent className="w-5 h-5 text-text-subtle group-hover:text-primary-green transition-colors" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer & Logout */}
        <div className="pt-4 border-t border-border-light flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-pistachio-green text-white rounded-full flex items-center justify-center font-bold text-sm">
              {initialLetter}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-main leading-tight truncate">{user.name}</p>
              <p className="text-xs text-text-subtle truncate">{user.state ? user.state : user.role}</p>
            </div>
          </div>

          <LogoutButton className="p-2 text-text-subtle hover:text-accent-cherry rounded-lg hover:bg-surface-muted transition-colors" />
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden bg-surface-card border-b border-border-light px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Sprout className="w-6 h-6 text-primary-green" />
          <span className="font-bold text-lg text-primary-green">Smart Crop</span>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="text-xs font-semibold text-accent-cherry bg-surface-muted px-3 py-1.5 rounded-lg border border-border-light">
            Logout
          </button>
        </form>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        {children}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-card border-t border-border-light flex justify-around py-2 z-50 shadow-soft">
        {NAV_ITEMS.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium text-text-subtle hover:text-primary-green transition-colors"
            >
              <IconComponent className="w-5 h-5 text-primary-green" />
              {item.name.split(' ')[0]}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}