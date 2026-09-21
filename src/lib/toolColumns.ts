// Columns added to `tools` after launch (migrations 0015 theme_color, 0016
// description). A database that hasn't had them applied yet errors on any
// select/update that names them — so every read/write that uses them retries
// without on that specific error, instead of taking the whole page down.
export const BASE_TOOL_COLUMNS = "id, name, schema, owner_id, visibility";
export const EXTRA_TOOL_COLUMNS = "theme_color, description";

export function isMissingColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  // 42703 is Postgres itself; PGRST204 is PostgREST's schema-cache miss, which
  // is what an insert/update naming an unmigrated column actually returns.
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .* does not exist/i.test(error.message ?? "") ||
    /could not find the '.*' column/i.test(error.message ?? "")
  );
}

export const DEFAULT_THEME_COLOR = "#171717";

/** "#171717" is the column default, meaning the owner never picked an accent —
 * renderers should then use the design's own defaults, not literal near-black. */
export function accentOf(color: string | null | undefined): string | undefined {
  return color && color.toLowerCase() !== DEFAULT_THEME_COLOR ? color : undefined;
}
