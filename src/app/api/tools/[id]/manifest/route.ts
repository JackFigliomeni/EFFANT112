import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Per-tool Web App Manifest — linked from /tools/[id]'s <head> (see that
 * page's generateMetadata). This is what lets "Add to Home Screen" install
 * a specific tool as its own standalone app, icon and all, instead of just
 * bookmarking the browser tab.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: tool } = await admin.from("tools").select("name, theme_color").eq("id", id).maybeSingle();
  const name = tool?.name ?? "Tool";
  const themeColor = tool?.theme_color ?? "#171717";

  const manifest = {
    name,
    short_name: name.length > 30 ? `${name.slice(0, 29)}…` : name,
    start_url: `/tools/${id}`,
    scope: `/tools/${id}`,
    display: "standalone",
    background_color: themeColor,
    theme_color: themeColor,
    icons: [
      { src: `/api/tool-icon/${id}?size=192`, sizes: "192x192", type: "image/png" },
      { src: `/api/tool-icon/${id}?size=512`, sizes: "512x512", type: "image/png" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
