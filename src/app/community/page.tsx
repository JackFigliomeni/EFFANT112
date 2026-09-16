import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Browsable across every workspace — anyone, signed in or not, can see what
 * other people have published as "public". Deliberately no author
 * attribution shown yet (we only have owner_id/email, and publishing a
 * tool shouldn't out someone's email address); add a display_name field to
 * profiles before showing "by ...".
 */
export default async function CommunityPage() {
  const supabase = await createClient();

  const { data: tools, error } = await supabase
    .from("tools")
    .select("id, name, created_at")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Community</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Tools anyone has made public — browsable without an account. Mark your own tool
          &ldquo;public&rdquo; in the builder to show it here.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
        {(tools ?? []).map((tool) => (
          <li key={tool.id} className="flex items-center justify-between px-4 py-3">
            <Link href={`/tools/${tool.id}`} className="text-sm font-medium hover:underline">
              {tool.name}
            </Link>
            <span className="text-xs text-black/50 dark:text-white/50">
              {new Date(tool.created_at).toLocaleDateString()}
            </span>
          </li>
        ))}
        {(tools ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-black/50 dark:text-white/50">
            Nothing public yet — be the first.
          </li>
        )}
      </ul>
    </div>
  );
}
