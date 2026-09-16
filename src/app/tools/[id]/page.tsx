import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { validateToolSchema } from "@/lib/schema";
import { ToolRenderer } from "@/components/renderer/ToolRenderer";
import { ReportButton } from "@/components/ReportButton";

export default async function ToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tool, error } = await supabase
    .from("tools")
    .select("id, name, schema, owner_id, visibility")
    .eq("id", id)
    .single();

  if (error || !tool) {
    return (
      <div className="mx-auto max-w-lg p-6 text-sm">
        Couldn&rsquo;t load this tool — either it doesn&rsquo;t exist, or you don&rsquo;t have
        access to it.
        {error && <p className="mt-2 text-black/50 dark:text-white/50">{error.message}</p>}
      </div>
    );
  }

  const validation = validateToolSchema(tool.schema);
  if (!validation.ok) {
    return (
      <div className="mx-auto max-w-lg p-6 text-sm text-red-600">
        This tool&rsquo;s saved schema is invalid: {validation.error}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{tool.name}</h1>
        {user?.id === tool.owner_id && (
          <Link href={`/builder?id=${tool.id}`} className="text-sm underline">
            Edit
          </Link>
        )}
      </div>
      <ToolRenderer schema={validation.schema} toolId={tool.id} />
      {tool.visibility === "public" && user?.id !== tool.owner_id && (
        <ReportButton toolId={tool.id} />
      )}
    </div>
  );
}
