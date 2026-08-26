'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function handleLogout() {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  redirect('/login');
}