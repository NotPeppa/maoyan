import { createMonitor, listMonitors } from '@/lib/monitor-store';
import { extractProjectId } from '@/lib/maoyan';
import { isWxPusherConfigured } from '@/lib/wxpusher';

export async function GET() {
  return Response.json({
    monitors: await listMonitors(),
    notificationEnabled: isWxPusherConfigured(),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const sourceUrl = body.url?.trim() ?? '';
    const projectId = extractProjectId(sourceUrl);
    if (!projectId)
      return Response.json(
        { error: '请输入有效的猫眼演出详情链接' },
        { status: 400 },
      );
    const monitor = await createMonitor(projectId, sourceUrl);
    return Response.json({ monitor }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '添加失败' },
      { status: 502 },
    );
  }
}
