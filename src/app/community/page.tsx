"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ShareMenu } from "@/components/ShareMenu";
import { Button, ButtonLink } from "@/components/ui/button";
import { DEFAULT_THEME_COLOR, isMissingColumn } from "@/lib/toolColumns";

export const dynamic = "force-dynamic";

type CommunityTool = {
  id: string;
  name: string;
  created_at: string;
  theme_color?: string | null;
  description?: string | null;
};

/**
 * Everything anyone has published, browsable without an account. No author
 * shown on purpose: we only have owner_id/email, and publishing a tool
 * shouldn't out someone's email address — add a display_name to profiles
 * before showing "by ...".
 */
export default function CommunityPage() {
  const supabase = createClient();
  const [tools, setTools] = useState<CommunityTool[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      let result = await supabase
        .from("tools")
        .select("id, name, created_at, theme_color, description")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(100);
      if (isMissingColumn(result.error)) {
        result = (await supabase
          .from("tools")
          .select("id, name, created_at")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(100)) as typeof result;
      }
      const { data, error } = result;
      if (error) {
        setError(error.message);
        return;
      }
      setTools((data ?? []) as CommunityTool[]);
    }
    load();
  }, [supabase]);

  const filtered = useMemo(() => {
    if (!tools) return null;
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter((t) => `${t.name} ${t.description ?? ""}`.toLowerCase().includes(q));
  }, [tools, query]);

  return (
    <div>
      <section className="community-header">
        <div>
          <span className="font-mono text-[9px] uppercase text-signal">Community</span>
          <h1 className="mt-3 max-w-lg text-3xl font-semibold">Tools made by people, moving between people.</h1>
        </div>
        <div className="flex flex-col items-start gap-5">
          <label className="community-search w-full">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools, routines, needs…"
              aria-label="Search community tools"
            />
          </label>
          <ShareMenu url="/community" title="Tools people have built on effant" label="Share this page" />
        </div>
      </section>

      <section className="mt-6">
        {error && <p className="py-8 text-sm text-destructive">{error}</p>}

        {filtered === null ? (
          !error && <p className="py-24 text-center text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="border-t border-border py-24 text-center">
            <div className="community-pulse justify-center" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              {tools && tools.length > 0 ? "Nothing matches that search." : "Nothing published yet."}
            </p>
            {!(tools && tools.length > 0) && (
              <p className="mt-2 text-xs text-muted-foreground">
                <Link href="/publish" className="underline">
                  Publish one of yours
                </Link>{" "}
                and it shows up here.
              </p>
            )}
          </div>
        ) : (
          filtered.map((tool, index) => {
            const accent = tool.theme_color && tool.theme_color !== DEFAULT_THEME_COLOR ? tool.theme_color : "var(--signal)";
            const open = openId === tool.id;
            return (
              <article
                key={tool.id}
                className="animate-reveal border-t border-border py-9"
                style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
              >
                <div className="grid gap-6 md:grid-cols-[1.4rem_1fr_auto] md:gap-8">
                  <span className="mt-3 hidden size-3 rounded-full md:block" style={{ backgroundColor: accent, boxShadow: `0 0 0 .4rem color-mix(in oklab, ${accent} 14%, transparent)` }} />
                  <div className="min-w-0">
                    <Link href={`/tools/${tool.id}`} className="block text-3xl font-semibold leading-tight tracking-tight hover:underline md:text-4xl">
                      {tool.name}
                    </Link>
                    {tool.description && (
                      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
                    )}
                    <p className="mt-4 font-mono text-[9px] uppercase text-muted-foreground">
                      Published {new Date(tool.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2 md:justify-end">
                    <Button variant="quiet" size="sm" onClick={() => setOpenId(open ? null : tool.id)}>
                      {open ? "Close preview" : "Preview"}
                    </Button>
                    <ShareMenu url={`/tools/${tool.id}`} title={tool.name} />
                    <ButtonLink href={`/tools/${tool.id}`} variant="ink" size="sm">
                      Open
                    </ButtonLink>
                  </div>
                </div>

                {open && (
                  <div className="animate-reveal mt-8 md:ml-[3.2rem]">
                    <iframe
                      src={`/tools/${tool.id}`}
                      title={`Preview of ${tool.name}`}
                      className="h-[30rem] w-full rounded-[20px] border border-border bg-card/60 shadow-soft"
                    />
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
