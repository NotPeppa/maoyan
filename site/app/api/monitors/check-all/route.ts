import { checkAllMonitors, listMonitors } from '@/lib/monitor-store';
import { isWxPusherConfigured } from '@/lib/wxpusher';

export async function POST() {
  await checkAllMonitors();
  return Response.json({
    monitors: await listMonitors(),
    notificationEnabled: isWxPusherConfigured(),
  });
}
