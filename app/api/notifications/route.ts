import { listNotificationHistory } from '@/lib/monitor-store';

export async function GET(request: Request) {
  const requestedLimit = Number(new URL(request.url).searchParams.get('limit'));
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 50;

  return Response.json({ notifications: await listNotificationHistory(limit) });
}
