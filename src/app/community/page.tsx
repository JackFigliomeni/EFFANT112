"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShareMenu } from "@/components/ShareMenu";
import { Button, ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type CommunityTool = {
  id: string;
  name: string;
  created_at: string;
  theme_color?: string | null;
  description?: string | null;
  author: string | null;
};

/** Everything anyone has published, browsable without an account — including
 * who published it, via /api/community (profiles.display_name isn't
 * readable cross-user under RLS, so that route reads it with the admin
 * client instead of this page querying Supabase directly). */
export default function CommunityPage() {
  const [tools, setTools] = useState<CommunityTool[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/community");
        const body = await res.json();
        if (!res.ok) {
          setError(body.error ?? "Couldn't load the community page.");
          return;
        }
        setTools(body.tools as CommunityTool[]);
      } catch {
        setError("Couldn't reach the server.");
      }
    }
    load();
  }, []);

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
          <div className="grid grid-cols-1 gap-6 border-t border-border pt-9 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tool, index) => {
              const open = openId === tool.id;
              return (
                <article
                  key={tool.id}
                  className="animate-reveal flex flex-col overflow-hidden rounded-[20px] border border-border bg-card/60 shadow-soft"
                  style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                >
                  <Link href={`/tools/${tool.id}`} className="block aspect-square w-full overflow-hidden bg-muted">
                    <img
                      src={`/api/tool-icon/${tool.id}?size=400`}
                      alt=""
                      className="size-full object-cover transition-transform hover:scale-105"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <Link href={`/tools/${tool.id}`} className="text-lg font-semibold leading-tight tracking-tight hover:underline">
                      {tool.name}
                    </Link>
                    {tool.description && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
                    )}
                    <p className="mt-auto pt-2 font-mono text-[9px] uppercase text-muted-foreground">
                      {tool.author && `By ${tool.author} · `}
                      {new Date(tool.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button variant="quiet" size="sm" onClick={() => setOpenId(open ? null : tool.id)}>
                        {open ? "Close" : "Preview"}
                      </Button>
                      <ShareMenu url={`/tools/${tool.id}`} title={tool.name} />
                      <ButtonLink href={`/tools/${tool.id}`} variant="ink" size="sm" className="ml-auto">
                        Open
                      </ButtonLink>
                    </div>
                  </div>

                  {open && (
                    <div className="animate-reveal border-t border-border p-3">
                      <iframe
                        src={`/tools/${tool.id}`}
                        title={`Preview of ${tool.name}`}
                        className="h-96 w-full rounded-[14px] border border-border bg-card/60"
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
