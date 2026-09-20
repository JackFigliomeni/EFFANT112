// Columns added to `tools` after launch (migrations 0015 theme_color, 0016
// description). A database that hasn't had them applied yet errors on any
// select/update that names them — so every read/write that uses them retries
// without on that specific error, instead of taking the whole page down.
export const BASE_TOOL_COLUMNS = "id, name, schema, owner_id, visibility";
export const EXTRA_TOOL_COLUMNS = "theme_color, description";

export function isMissingColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}

export const DEFAULT_THEME_COLOR = "#171717";
