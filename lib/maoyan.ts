const DETAIL_API = 'https://yanchu.maoyan.com/my/odea/project/detail';

export type MaoyanStatus = {
  projectId: string;
  name: string;
  venue: string | null;
  showTime: string | null;
  buttonText: string;
  saleStatus: number | null;
  ticketStatus: number | null;
  available: boolean;
};

export function extractProjectId(input: string): string | null {
  const value = input.trim();
  if (/^\d{4,}$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (!/(^|\.)maoyan\.com$/.test(url.hostname)) return null;
    const match = `${url.pathname}${url.hash}`.match(/\/detail\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function fetchMaoyanStatus(
  projectId: string,
): Promise<MaoyanStatus> {
  const url = new URL(DETAIL_API);
  url.searchParams.set('projectId', projectId);
  url.searchParams.set('detailType', '1');

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      referer: 'https://show.maoyan.com/',
      'user-agent': 'Mozilla/5.0 (compatible; TicketWatch/0.1)',
      uuid: crypto.randomUUID(),
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`猫眼接口返回 ${response.status}`);
  const payload = (await response.json()) as {
    success?: boolean;
    error?: { message?: string };
    data?: {
      baseProjectVO?: {
        performanceId?: number;
        name?: string;
        showTimeRange?: string;
        saleStatus?: number;
        ticketStatus?: number;
        buttonContext?: { message?: string };
      };
      shopVO?: { shopName?: string };
    };
  };

  const project = payload.data?.baseProjectVO;
  const buttonText = project?.buttonContext?.message?.trim();
  if (!payload.success || !project?.name || !buttonText) {
    throw new Error(payload.error?.message || '没有读取到项目状态');
  }

  return {
    projectId: String(project.performanceId ?? projectId),
    name: project.name,
    venue: payload.data?.shopVO?.shopName ?? null,
    showTime: project.showTimeRange?.trim() ?? null,
    buttonText,
    saleStatus: project.saleStatus ?? null,
    ticketStatus: project.ticketStatus ?? null,
    available: buttonText === '立即购票',
  };
}
