export type StatusChangeNotification = {
  name: string;
  projectId: string;
  sourceUrl: string;
  previousButtonText: string;
  buttonText: string;
  available: boolean;
  venue: string | null;
  showTime: string | null;
};

type WxPusherResponse = { code?: number; msg?: string };

function csv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isWxPusherConfigured() {
  return Boolean(
    process.env.WXPUSHER_APP_TOKEN?.trim() &&
    (csv(process.env.WXPUSHER_UIDS).length ||
      csv(process.env.WXPUSHER_TOPIC_IDS).length),
  );
}

export async function sendStatusChangeNotification(
  change: StatusChangeNotification,
) {
  const appToken = process.env.WXPUSHER_APP_TOKEN?.trim();
  const uids = csv(process.env.WXPUSHER_UIDS);
  const topicIds = csv(process.env.WXPUSHER_TOPIC_IDS)
    .map(Number)
    .filter(Number.isSafeInteger);
  if (!appToken || (!uids.length && !topicIds.length)) {
    return { sent: false as const, reason: 'WxPusher 未配置' };
  }

  const state = change.available ? '可以购票' : change.buttonText;
  const details = [change.showTime, change.venue].filter(Boolean).join(' · ');
  const content = [
    `# ${change.available ? '🎫 发现可购票' : '猫眼票态已变化'}`,
    `**${change.name}**`,
    details,
    `状态：${change.previousButtonText} → **${state}**`,
    `[打开猫眼演出页面](${change.sourceUrl})`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const response = await fetch(
    'https://wxpusher.zjiecode.com/api/send/message',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        appToken,
        content,
        summary: `${change.name}：${state}`.slice(0, 100),
        contentType: 3,
        uids,
        topicIds,
        url: change.sourceUrl,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  const result = (await response.json().catch(() => ({}))) as WxPusherResponse;
  if (!response.ok || result.code !== 1000) {
    throw new Error(result.msg || `WxPusher 返回 HTTP ${response.status}`);
  }
  return { sent: true as const };
}
