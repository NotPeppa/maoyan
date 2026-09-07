import { checkMonitor, deleteMonitor } from '@/lib/monitor-store';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return Response.json({ monitor: await checkMonitor(Number(id)) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '检查失败' },
      { status: 502 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await deleteMonitor(Number(id));
  return new Response(null, { status: 204 });
}
