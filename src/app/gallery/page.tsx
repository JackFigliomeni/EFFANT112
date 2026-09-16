import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function GalleryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-6 text-sm">
        <p>
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to see your workspace&rsquo;s tools.
        </p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, workspaces(name, invite_code)")
    .eq("id", user.id)
    .maybeSingle();

  // Explicit filter, not just RLS: RLS additionally allows reading ANY
  // public tool (so the /community page works), so without this filter
  // every public tool from every workspace would leak into "your"
  // workspace's gallery too.
  let toolsQuery = supabase
    .from("tools")
    .select("id, name, visibility, owner_id")
    .order("created_at", { ascending: false });
  toolsQuery = profile?.workspace_id
    ? toolsQuery.or(`owner_id.eq.${user.id},workspace_id.eq.${profile.workspace_id}`)
    : toolsQuery.eq("owner_id", user.id);
  const { data: tools, error } = await toolsQuery;

  const workspace = profile?.workspaces as unknown as { name: string; invite_code: string } | null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{workspace?.name ?? "Your workspace"}</h1>
          {workspace && (
            <p className="text-sm text-black/60 dark:text-white/60">
              Invite others with:{" "}
              <code className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
                /login?invite={workspace.invite_code}
              </code>
            </p>
          )}
        </div>
        <Link
          href="/generate"
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          + New tool
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
        {(tools ?? []).map((tool) => (
          <li key={tool.id} className="flex items-center justify-between px-4 py-3">
            <Link href={`/tools/${tool.id}`} className="text-sm font-medium hover:underline">
              {tool.name}
            </Link>
            <span className="text-xs text-black/50 dark:text-white/50">
              {tool.owner_id === user.id ? "yours" : "workspace"} · {tool.visibility}
            </span>
          </li>
        ))}
        {(tools ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-black/50 dark:text-white/50">
            No tools yet — create one.
          </li>
        )}
      </ul>
    </div>
  );
}
