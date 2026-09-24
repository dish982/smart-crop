import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('auth_token')?.value;
  const userRole = request.cookies.get('user_role')?.value; // JWT payload ya login ke waqt set karein
  const { pathname } = request.nextUrl;

  // 1. Unauthenticated users trying to access /dashboard or /admin -> Redirect to /login
  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Non-Admin users trying to access /admin -> Redirect to /dashboard
  if (pathname.startsWith('/admin') && userRole !== 'Admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url)); 
  }

  // 3. Already logged in users trying to access /login or /signup
  if ((pathname === '/login' || pathname === '/signup') && token) {
    if (userRole === 'Admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/signup'],
};