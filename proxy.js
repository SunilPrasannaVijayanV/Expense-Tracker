import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Public routes
  const publicRoutes = ['/login', '/signup', '/api/auth/login', '/api/auth/signup'];

  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // If already logged in and trying to access login/signup pages, redirect to dashboard
    if (token && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes: check for token
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/expenses/:path*',
    '/budgets/:path*',
    '/analytics/:path*',
    '/api/expenses/:path*',
    '/api/dashboard/:path*',
    '/api/budgets/:path*',
    '/api/categories/:path*',
    '/api/chat/:path*',
    '/login',
    '/signup',
  ],
};
