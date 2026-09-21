import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { findAppBlock, validateToolSchema } from "@/lib/schema";
import { ToolRenderer } from "@/components/renderer/ToolRenderer";
import { ReportButton } from "@/components/ReportButton";
import { ToolServiceWorker } from "@/components/ToolServiceWorker";
import { ToolPageMarker } from "@/components/ToolPageMarker";
import { InstallAppButton, DownloadAppButton } from "@/components/AppInstall";
import { ShareMenu } from "@/components/ShareMenu";
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

  const app = findAppBlock(validation.schema.blocks);
  const accent = accentOf(tool.theme_color);

  return (
    <div className={`mx-auto flex flex-col gap-6 py-6 ${app ? "max-w-5xl" : "max-w-xl gap-8 py-10"}`}>
      <ToolServiceWorker />
      <ToolPageMarker />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">{tool.name}</h1>
          {tool.description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{tool.description}</p>}
        </div>
        <div className="site-chrome-actions flex flex-wrap items-center gap-2">
          <InstallAppButton />
          {app && <DownloadAppButton html={app.html} name={tool.name} accent={accent} />}
          <ShareMenu url={`/tools/${tool.id}`} title={tool.name} />
          {user?.id === tool.owner_id && (
            <Link href={`/builder?id=${tool.id}`} className="px-2 text-xs text-muted-foreground underline hover:text-foreground">
              Edit
            </Link>
          )}
        </div>
      </div>
      <ToolRenderer
        schema={validation.schema}
        toolId={tool.id}
        themeColor={accent}
        name={tool.name}
        frameClassName="h-[calc(100dvh-13rem)] min-h-[30rem] rounded-[20px] border border-border shadow-soft"
      />
      {tool.visibility === "public" && user?.id !== tool.owner_id && <ReportButton toolId={tool.id} />}
    </div>
  );
}
