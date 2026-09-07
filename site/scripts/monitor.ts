import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();
const { checkAllMonitors, listMonitors } = await import('../lib/monitor-store');

const intervalMs = Number(process.env.TICKET_WATCH_INTERVAL_MS ?? 60_000);
if (!Number.isFinite(intervalMs) || intervalMs < 10_000) {
  throw new Error('TICKET_WATCH_INTERVAL_MS 必须是不小于 10000 的数字');
}

async function check() {
  const startedAt = new Date();
  try {
    const results = await checkAllMonitors();
    const monitors = await listMonitors();
    const failed = results.filter(
      (result) => result.status === 'rejected',
    ).length;
    const available = monitors.filter((item) => Boolean(item.available));
    console.log(
      `[${startedAt.toLocaleString('zh-CN')}] 已检查 ${monitors.length} 个项目，可购 ${available.length} 个，失败 ${failed} 个`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[${startedAt.toLocaleString('zh-CN')}] 检查失败：${message}`,
    );
  }
}

console.log(
  `票候后台监控已启动，每 ${Math.round(intervalMs / 1000)} 秒检查一次。`,
);
await check();
setInterval(check, intervalMs);
