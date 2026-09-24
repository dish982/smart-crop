export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import Navbar from '@/components/common/Navbar';

// Option 2: Correct relative path
// import Navbar from '../../components/common/Navbar';

export default async function DashboardLayout({ children }) {
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

  return (
    <div className="min-h-screen bg-bg-cream text-text-main flex flex-col md:flex-row">
      <Navbar user={user} />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}