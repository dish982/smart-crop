import { NextResponse } from 'next/server';

export function middleware(request) {
  // CRITICAL FIX: Changed 'token' to 'auth_token'
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. If trying to access protected dashboard routes without a token -> Redirect to Login
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If already logged in and trying to access /login or /signup -> Redirect to Dashboard
  if ((pathname === '/login' || pathname === '/signup') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Config matcher ensures middleware runs only on relevant routes
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};