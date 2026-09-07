import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPath = pathname === '/login' || pathname === '/api/auth/login';
  const authenticated = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (isLoginPath) {
    if (authenticated && pathname === '/login')
      return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }
  if (authenticated) return NextResponse.next();
  if (pathname.startsWith('/api/'))
    return Response.json({ error: '请先登录' }, { status: 401 });

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)'],
};
