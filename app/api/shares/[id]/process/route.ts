import { json, mutationAllowed, processShare } from "../../../../../lib/shares";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!mutationAllowed(req)) return json({ error: "请求来源无效。" }, 403);
  const { id } = await params;
  return processShare(id);
}
