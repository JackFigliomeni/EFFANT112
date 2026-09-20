import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { validateToolSchema } from "@/lib/schema";
import { ToolRenderer } from "@/components/renderer/ToolRenderer";
import { ReportButton } from "@/components/ReportButton";
import { ToolServiceWorker } from "@/components/ToolServiceWorker";
import { BASE_TOOL_COLUMNS, EXTRA_TOOL_COLUMNS, accentOf, isMissingColumn } from "@/lib/toolColumns";

/**
 * Makes a tool "Add to Home Screen"-installable as its own standalone app —
 * own icon, own name, no browser chrome — via a per-tool manifest (see
 * src/app/api/tools/[id]/manifest/route.ts) rather than one static manifest
 * for the whole site.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tool } = await supabase.from("tools").select("name").eq("id", id).maybeSingle();
  const name = tool?.name ?? "Tool";

  return {
    title: name,
    manifest: `/api/tools/${id}/manifest`,
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    icons: { apple: `/api/tool-icon/${id}?size=192` },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: tool, error } = await supabase
    .from("tools")
    .select(`${BASE_TOOL_COLUMNS}, ${EXTRA_TOOL_COLUMNS}`)
    .eq("id", id)
    .single();
  if (isMissingColumn(error)) {
    ({ data: tool, error } = await supabase.from("tools").select(BASE_TOOL_COLUMNS).eq("id", id).single());
  }

  if (error || !tool) {
    return (
      <div className="mx-auto max-w-lg py-24 text-sm">
        Couldn&rsquo;t load this tool — either it doesn&rsquo;t exist, or you don&rsquo;t have
        access to it.
        {error && <p className="mt-2 text-muted-foreground">{error.message}</p>}
      </div>
    );
  }

  const validation = validateToolSchema(tool.schema);
  if (!validation.ok) {
    return (
      <div className="mx-auto max-w-lg py-24 text-sm text-destructive">
        This tool&rsquo;s saved schema is invalid: {validation.error}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 py-10">
      <ToolServiceWorker />
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">{tool.name}</h1>
        {user?.id === tool.owner_id && (
          <Link href={`/builder?id=${tool.id}`} className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground">
            Edit
          </Link>
        )}
      </div>
      {tool.description && <p className="-mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{tool.description}</p>}
      <ToolRenderer schema={validation.schema} toolId={tool.id} themeColor={accentOf(tool.theme_color)} />
      {tool.visibility === "public" && user?.id !== tool.owner_id && <ReportButton toolId={tool.id} />}
    </div>
  );
}
