import { createClient } from "@/lib/supabase/server";
import { DismissReportButton } from "@/components/DismissReportButton";

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="mx-auto max-w-2xl p-6 text-sm">Sign in first.</div>;
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return <div className="mx-auto max-w-2xl p-6 text-sm">Not authorized.</div>;
  }

  const { data: reports, error } = await supabase
    .from("reports")
    .select("id, tool_id, reporter_id, reason, created_at, tools(name, visibility)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Everything reported on public tools, newest first.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-border">
        {(reports ?? []).map((r) => {
          const tool = r.tools as unknown as { name: string; visibility: string } | null;
          return (
            <li key={r.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <a href={`/tools/${r.tool_id}`} className="font-medium hover:underline">
                  {tool?.name ?? r.tool_id}
                </a>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                  <DismissReportButton reportId={r.id} />
                </span>
              </div>
              <p className="text-foreground/80">{r.reason}</p>
              <span className="text-xs text-muted-foreground">
                tool currently: {tool?.visibility ?? "unknown/deleted"} · reporter:{" "}
                {r.reporter_id ? "signed in" : "anonymous"}
              </span>
            </li>
          );
        })}
        {(reports ?? []).length === 0 && !error && (
          <li className="px-4 py-6 text-sm text-muted-foreground">No reports.</li>
        )}
      </ul>
    </div>
  );
}
