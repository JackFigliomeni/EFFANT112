import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumn } from "@/lib/toolColumns";

export const runtime = "nodejs";

/**
 * Every publicly-visible tool, plus its owner's display name. Uses the
 * admin client (see lib/supabase/admin.ts) because `profiles` only allows
 * reading your own row — a browser visiting Community (deliberately usable
 * without an account) has no way to read *other* people's display_name
 * under RLS. Only `id`/`display_name` are read off profiles here, never
 * anything else on that row (plan, stripe ids, ...).
 */
export async function GET() {
  const admin = createAdminClient();

  let toolsRes = await admin
    .from("tools")
    .select("id, name, created_at, theme_color, description, owner_id")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(100);
  if (isMissingColumn(toolsRes.error)) {
    toolsRes = (await admin
      .from("tools")
      .select("id, name, created_at, owner_id")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(100)) as typeof toolsRes;
  }
  if (toolsRes.error) {
    return NextResponse.json({ error: toolsRes.error.message }, { status: 500 });
  }
  const tools = toolsRes.data ?? [];

  const ownerIds = [...new Set(tools.map((t) => t.owner_id).filter((id): id is string => !!id))];
  const namesByOwnerId = new Map<string, string>();
  if (ownerIds.length > 0) {
    const profilesRes = await admin.from("profiles").select("id, display_name").in("id", ownerIds);
    if (!isMissingColumn(profilesRes.error)) {
      for (const p of profilesRes.data ?? []) {
        if (p.display_name) namesByOwnerId.set(p.id, p.display_name);
      }
    }
  }

  return NextResponse.json({
    tools: tools.map((t) => ({ ...t, author: t.owner_id ? (namesByOwnerId.get(t.owner_id) ?? null) : null })),
  });
}
