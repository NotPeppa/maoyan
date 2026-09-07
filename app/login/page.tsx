'use client';

import { useState } from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || '登录失败');
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.assign(
        next?.startsWith('/') && !next.startsWith('//') ? next : '/',
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败，请重试');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_36px_rgba(255,72,72,.24)]">
            <Ticket className="size-6" />
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            登录票候
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            查看监控项目与票态变化
          </p>
        </div>
        <Card className="border-white/10 bg-card/75 shadow-2xl shadow-black/25">
          <CardContent className="p-6">
            <form className="space-y-5" onSubmit={submit}>
              <div>
                <label
                  className="mb-2 block text-sm font-medium"
                  htmlFor="username"
                >
                  账号
                </label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="h-11 border-white/10 bg-black/20"
                  required
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-sm font-medium"
                  htmlFor="password"
                >
                  密码
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 border-white/10 bg-black/20 pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <p
                role="alert"
                aria-live="polite"
                className="min-h-5 text-sm text-primary"
              >
                {error}
              </p>
              <Button
                type="submit"
                className="h-11 w-full gap-2"
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <LockKeyhole className="size-4" />
                )}
                {busy ? '正在登录' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
