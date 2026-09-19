import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// A fixed, deterministic-by-id palette — every install of a given tool
// gets the same color across devices/sessions without storing anything.
const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Generates a tool's home-screen icon on the fly — no upload, no per-tool
 * asset to manage. Uses the admin client (see lib/supabase/admin.ts)
 * because a browser installing/loading a PWA icon typically fetches it
 * without cookies, so this can't rely on the visitor's own session; only
 * the tool's name (not its data) is ever read here.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const size = Number(new URL(request.url).searchParams.get("size")) || 512;

  const admin = createAdminClient();
  const { data: tool } = await admin.from("tools").select("name").eq("id", id).maybeSingle();
  const name = tool?.name ?? "Tool";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: colorForId(id),
          color: "white",
          fontSize: size * 0.4,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        {initialsFor(name)}
      </div>
    ),
    { width: size, height: size },
  );
}
