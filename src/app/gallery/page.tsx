import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import { isMissingColumn, DEFAULT_THEME_COLOR } from "@/lib/toolColumns";

export default async function GalleryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-24 text-sm">
        <Link href="/login" className="underline">
          Sign in
        </Link>{" "}
        to see your workspace&rsquo;s tools.
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, workspaces(name, invite_code)")
    .eq("id", user.id)
    .maybeSingle();

  // Explicit filter, not just RLS: RLS also allows reading ANY public tool (so
  // the Community page works), so without this filter every public tool from
  // every workspace would leak into "your" workspace's gallery too.
  const query = (columns: string) => {
    let q = supabase.from("tools").select(columns).order("created_at", { ascending: false });
    q = profile?.workspace_id
      ? q.or(`owner_id.eq.${user.id},workspace_id.eq.${profile.workspace_id}`)
      : q.eq("owner_id", user.id);
    return q;
  };
  let result = await query("id, name, visibility, owner_id, theme_color");
  if (isMissingColumn(result.error)) result = await query("id, name, visibility, owner_id");
  const { data, error } = result;
  const tools = (data ?? []) as unknown as { id: string; name: string; visibility: string; owner_id: string; theme_color?: string | null }[];

  const workspace = profile?.workspaces as unknown as { name: string; invite_code: string } | null;

  return (
    <section className="mx-auto max-w-4xl py-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        {/* min-w-0 lets this flex item shrink below its content's natural
            width; without it a long unbroken name (workspaces default to
            "you@email.com's workspace") pushed the row wider than the
            viewport. break-words is the actual wrap so it's still legible
            instead of just no longer overflowing. */}
        <div className="min-w-0">
          <span className="font-mono text-[10px] uppercase text-signal">Workspace</span>
          <h1 className="mt-3 break-words text-3xl font-semibold">{workspace?.name ?? "Your workspace"}</h1>
          {workspace && (
            <p className="mt-3 text-xs text-muted-foreground">
              Invite others with{" "}
              <code className="rounded-full bg-accent px-2 py-0.5">/login?invite={workspace.invite_code}</code>
            </p>
          )}
        </div>
        <ButtonLink href="/generate" variant="signal">
          New tool
        </ButtonLink>
      </div>

      {error && <p className="mt-8 text-sm text-destructive">{error.message}</p>}

      <div className="mt-12">
        {tools.map((tool) => {
          const accent = tool.theme_color && tool.theme_color !== DEFAULT_THEME_COLOR ? tool.theme_color : "var(--cool)";
          return (
            <Link
              key={tool.id}
              href={`/tools/${tool.id}`}
              className="group flex items-center justify-between gap-6 border-t border-border py-6 transition-colors hover:bg-card/50"
            >
              <span className="flex items-center gap-4">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: accent }} />
                <span className="text-xl font-semibold group-hover:underline">{tool.name}</span>
              </span>
              <span className="font-mono text-[9px] uppercase text-muted-foreground">
                {tool.owner_id === user.id ? "yours" : "workspace"} · {tool.visibility}
              </span>
            </Link>
          );
        })}
        {tools.length === 0 && (
          <p className="border-t border-border py-16 text-center text-sm text-muted-foreground">
            No tools yet.{" "}
            <Link href="/generate" className="underline">
              Make your first one
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
