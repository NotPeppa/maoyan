export const SESSION_COOKIE = 'piaohou_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(value: string) {
  const base64 = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function getSecret() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET 必须至少包含 32 个字符');
  }
  return secret;
}

async function signature(payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return bytesToBase64Url(
    new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)),
    ),
  );
}

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  );
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function verifyCredentials(username: string, password: string) {
  const expectedUsername = process.env.AUTH_USERNAME?.trim();
  const expectedPassword = process.env.AUTH_PASSWORD;
  getSecret();
  if (!expectedUsername || !expectedPassword)
    throw new Error('登录凭据尚未配置');
  const [actualUser, configuredUser, actualPassword, configuredPassword] =
    await Promise.all([
      digest(username),
      digest(expectedUsername),
      digest(password),
      digest(expectedPassword),
    ]);
  return (
    equalBytes(actualUser, configuredUser) &&
    equalBytes(actualPassword, configuredPassword)
  );
}

export async function createSession(username: string) {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        username,
        expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      }),
    ),
  );
  return `${payload}.${await signature(payload)}`;
}

export async function verifySession(token: string | undefined) {
  if (!token) return false;
  try {
    const [payload, suppliedSignature, extra] = token.split('.');
    if (!payload || !suppliedSignature || extra) return false;
    const expectedSignature = await signature(payload);
    if (
      !equalBytes(
        base64UrlToBytes(suppliedSignature),
        base64UrlToBytes(expectedSignature),
      )
    )
      return false;
    const data = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payload)),
    ) as { expiresAt?: number };
    return (
      typeof data.expiresAt === 'number' &&
      data.expiresAt > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
};
