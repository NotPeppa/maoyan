'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  BellRing,
  ExternalLink,
  LoaderCircle,
  LogOut,
  Plus,
  Radio,
  RefreshCw,
  Ticket,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Monitor = {
  id: number;
  projectId: string;
  sourceUrl: string;
  name: string;
  venue: string | null;
  showTime: string | null;
  buttonText: string;
  available: number;
  lastCheckedAt: string;
  lastError: string | null;
};

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => Promise<unknown>;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

const CHECK_INTERVAL_MS = 60_000;

function relativeTime(value: string) {
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 10) return '刚刚检查';
  if (seconds < 60) return `${seconds} 秒前检查`;
  return `${Math.floor(seconds / 60)} 分钟前检查`;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || '请求失败');
  return body;
}

export function MonitorDashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const mounted = useRef(true);

  const loadMonitors = useCallback(async () => {
    const body = await readJson<{
      monitors: Monitor[];
      notificationEnabled: boolean;
    }>(await fetch('/api/monitors'));
    if (mounted.current) {
      setMonitors(body.monitors);
      setNotificationEnabled(body.notificationEnabled);
    }
    return body.monitors;
  }, []);

  const addMonitor = useCallback(
    async (sourceUrl: string) => {
      const value = sourceUrl.trim();
      if (!value) throw new Error('请先粘贴猫眼演出详情链接');
      await readJson(
        await fetch('/api/monitors', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: value }),
        }),
      );
      const rows = await loadMonitors();
      return { added: true, count: rows.length };
    },
    [loadMonitors],
  );

  const refreshAll = useCallback(async (announce = true) => {
    if (announce) {
      setBusy(true);
      setMessage('');
    }
    try {
      const body = await readJson<{
        monitors: Monitor[];
        notificationEnabled: boolean;
      }>(await fetch('/api/monitors/check-all', { method: 'POST' }));
      if (mounted.current) {
        setMonitors(body.monitors);
        setNotificationEnabled(body.notificationEnabled);
      }
      if (announce) setMessage('已完成全部检查');
      return { refreshed: body.monitors.length };
    } catch (error) {
      if (announce)
        setMessage(error instanceof Error ? error.message : '刷新失败');
      throw error;
    } finally {
      if (announce) setBusy(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadMonitors().catch((error) =>
      setMessage(error instanceof Error ? error.message : '加载失败'),
    );
    const timer = window.setInterval(
      () => void refreshAll(false).catch(() => undefined),
      CHECK_INTERVAL_MS,
    );
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [loadMonitors, refreshAll]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'add_ticket_monitor',
          title: '添加票务监控',
          description: '添加一个猫眼演出详情链接，并立即读取购票按钮状态。',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: '猫眼演出详情页链接' },
            },
            required: ['url'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          async execute(input) {
            const candidate = input as { url?: unknown };
            if (typeof candidate.url !== 'string')
              throw new Error('url 必须是字符串');
            return addMonitor(candidate.url);
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [addMonitor]);

  async function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await addMonitor(url);
      setUrl('');
      setMessage('已添加并完成首次检查');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '添加失败');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm('确定停止监控这个项目吗？')) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('删除失败');
      setMonitors((rows) => rows.filter((row) => row.id !== id));
      setMessage('已停止监控');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '删除失败');
    } finally {
      setBusy(false);
    }
  }

  const availableCount = monitors.filter((item) =>
    Boolean(item.available),
  ).length;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/8 bg-[#071013]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(255,72,72,.22)]">
              <Ticket className="size-5" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold tracking-tight">
                票候
              </p>
              <p className="text-xs text-muted-foreground">
                Maoyan ticket watch
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <span
                className={`size-2 rounded-full ${notificationEnabled ? 'bg-emerald-400' : 'bg-zinc-600'}`}
              />
              {notificationEnabled ? 'WxPusher 已连接' : 'WxPusher 未配置'}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 gap-2"
              onClick={() => void logout()}
            >
              <LogOut className="size-4" /> 退出
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
              <Radio className="size-4" /> 实时票务监控
            </div>
            <h1 className="max-w-2xl font-heading text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
              票一放出，
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">第一时间知道。</span>
            </h1>
          </div>
          <Card className="border-white/10 bg-card/70 shadow-2xl shadow-black/20">
            <CardContent className="p-4">
              <form onSubmit={submit}>
                <label
                  htmlFor="project-url"
                  className="mb-2 block text-sm font-medium"
                >
                  添加猫眼演出链接
                </label>
                <div className="flex gap-2">
                  <Input
                    id="project-url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://show.maoyan.com/...#/detail/..."
                    className="h-11 border-white/10 bg-black/20"
                    disabled={busy}
                  />
                  <Button
                    type="submit"
                    className="h-11 shrink-0 gap-2 px-4"
                    disabled={busy}
                  >
                    {busy ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}{' '}
                    添加
                  </Button>
                </div>
              </form>
              <output className="mt-2 block min-h-4 text-xs text-muted-foreground">
                {message || '自动识别项目编号并读取当前售票状态'}
              </output>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="watchlist-title" className="mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id="watchlist-title"
                className="font-heading text-xl font-semibold"
              >
                监控中
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {monitors.length} 个项目 · {availableCount} 个可购 ·
                页面打开时每 60 秒检查
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/10 bg-transparent"
              onClick={() => void refreshAll()}
              disabled={busy || monitors.length === 0}
            >
              <RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} />{' '}
              全部刷新
            </Button>
          </div>

          {monitors.length === 0 ? (
            <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/12 bg-card/30 p-8 text-center">
              <div>
                <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-white/5 text-muted-foreground">
                  <Activity className="size-5" />
                </div>
                <h3 className="font-medium">还没有监控项目</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  粘贴一个猫眼演出详情链接开始监控
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {monitors.map((item) => {
                const available = Boolean(item.available);
                return (
                  <article
                    key={item.id}
                    className="group grid gap-4 rounded-2xl border border-white/8 bg-card/55 p-5 transition hover:border-white/15 hover:bg-card/75 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                  >
                    <div
                      className={`grid size-12 place-items-center rounded-xl ${available ? 'bg-emerald-400/12 text-emerald-300' : 'bg-white/5 text-muted-foreground'}`}
                    >
                      {available ? (
                        <BellRing className="size-5" />
                      ) : (
                        <Activity className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium">{item.name}</h3>
                        <Badge
                          variant="outline"
                          className="border-white/10 text-muted-foreground"
                        >
                          #{item.projectId}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {[item.showTime, item.venue]
                          .filter(Boolean)
                          .join(' · ') || '猫眼演出'}
                      </p>
                      {item.lastError && (
                        <p className="mt-1 text-xs text-primary">
                          {item.lastError}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span
                        className={`size-2.5 rounded-full ${available ? 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.8)]' : 'bg-zinc-600'}`}
                      />
                      <div className="min-w-24">
                        <p
                          className={`text-sm font-semibold ${available ? 'text-emerald-300' : 'text-zinc-400'}`}
                        >
                          {item.buttonText}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {relativeTime(item.lastCheckedAt)}
                        </p>
                      </div>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="打开猫眼页面"
                        className={buttonVariants({
                          variant: 'ghost',
                          size: 'icon-sm',
                        })}
                      >
                        <ExternalLink className="size-4" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="停止监控"
                        onClick={() => void remove(item.id)}
                        disabled={busy}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
