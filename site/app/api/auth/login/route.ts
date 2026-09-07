import { NextResponse } from 'next/server';
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyCredentials,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
    };
    if (
      typeof body.username !== 'string' ||
      typeof body.password !== 'string'
    ) {
      return Response.json({ error: '请输入账号和密码' }, { status: 400 });
    }
    if (!(await verifyCredentials(body.username.trim(), body.password))) {
      return Response.json({ error: '账号或密码不正确' }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE,
      await createSession(body.username.trim()),
      sessionCookieOptions,
    );
    return response;
  } catch (error) {
    console.error(error);
    return Response.json({ error: '登录服务尚未正确配置' }, { status: 503 });
  }
}
