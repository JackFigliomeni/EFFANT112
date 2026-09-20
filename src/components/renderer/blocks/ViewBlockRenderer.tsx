import type { ViewBlock } from "@/lib/schema";

type Row = { id: string; data: Record<string, unknown>; created_at: string };

function numericValues(rows: Row[], field: string): number[] {
  return rows
    .map((r) => Number(r.data[field]))
    .filter((n) => Number.isFinite(n));
}

/** Renders a delete (and/or toggle) button after a row's content, if the
 * schema declared an update_record/delete_record action targeting this
 * view's source table. */
function RowActions({
  rowId,
  toggleField,
  toggleValue,
  onToggle,
  onDelete,
}: {
  rowId: string;
  toggleField?: string;
  toggleValue?: unknown;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  if (!onToggle && !onDelete) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-2">
      {onToggle && toggleField && (
        <button
          onClick={() => onToggle(rowId)}
          className="text-xs underline text-muted-foreground hover:text-foreground"
        >
          {toggleValue ? `unmark ${toggleField}` : `mark ${toggleField}`}
        </button>
      )}
      {onDelete && (
        <button
          onClick={() => onDelete(rowId)}
          className="text-xs text-red-500 hover:text-destructive"
          aria-label="Delete"
        >
          ×
        </button>
      )}
    </span>
  );
}

export function ViewBlockRenderer({
  block,
  rows,
  onDelete,
  onToggle,
  toggleField,
  themeColor,
}: {
  block: ViewBlock;
  rows: Row[];
  onDelete?: (id: string) => void;
  onToggle?: (id: string) => void;
  toggleField?: string;
  // Picked in the Builder's Design tab (tools.theme_color) — falls back to
  // the emerald default below when a tool predates that column.
  themeColor?: string;
}) {
  if (block.display === "count") {
    return (
      <div className="rounded-lg border border-border bg-card/70 p-4">
        <div className="text-3xl font-semibold">{rows.length}</div>
        <div className="text-sm text-muted-foreground">records in &ldquo;{block.source}&rdquo;</div>
      </div>
    );
  }

  if (block.display === "sum" || block.display === "average") {
    const values = block.field ? numericValues(rows, block.field) : [];
    const result =
      block.display === "sum"
        ? values.reduce((a, b) => a + b, 0)
        : values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;
    return (
      <div className="rounded-lg border border-border bg-card/70 p-4">
        <div className="text-3xl font-semibold">{Number.isInteger(result) ? result : result.toFixed(2)}</div>
        <div className="text-sm text-muted-foreground">
          {block.display} of &ldquo;{block.field}&rdquo; across {values.length} record{values.length === 1 ? "" : "s"}
        </div>
      </div>
    );
  }

  if (block.display === "latest") {
    const latest = rows[0]; // rows already ordered newest-first by the caller
    return (
      <div className="rounded-lg border border-border bg-card/70 p-4">
        {latest ? (
          <ul className="text-sm">
            {Object.entries(latest.data).map(([k, v]) => (
              <li key={k}>
                <span className="text-muted-foreground">{k}:</span> {String(v)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No records yet.</p>
        )}
      </div>
    );
  }

  if (block.display === "chart") {
    const field = block.field ?? "";
    // Oldest-to-newest, last 12 points, for a left-to-right reading chart.
    const points = [...rows]
      .reverse()
      .slice(-12)
      .map((r) => Number(r.data[field]))
      .map((n) => (Number.isFinite(n) ? n : 0));
    const max = Math.max(1, ...points);
    const barWidth = 24;
    const gap = 6;
    const height = 100;
    const width = points.length * (barWidth + gap) || barWidth;

    return (
      <div className="rounded-lg border border-border bg-card/70 p-4">
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">No records yet.</p>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" preserveAspectRatio="none">
            {points.map((v, i) => {
              const barHeight = (v / max) * (height - 4);
              return (
                <rect
                  key={i}
                  x={i * (barWidth + gap)}
                  y={height - barHeight}
                  width={barWidth}
                  height={barHeight}
                  fill={themeColor ?? "var(--fresh)"}
                />
              );
            })}
          </svg>
        )}
        <div className="mt-1 text-xs text-muted-foreground">&ldquo;{field}&rdquo; over time</div>
      </div>
    );
  }

  if (block.display === "calendar") {
    // Simple calendar: group rows by date (looks for a "date" field, else
    // falls back to created_at) and render the current month as a grid,
    // marking days that have at least one record.
    const markedDates = new Set(
      rows.map((r) => {
        const raw = (r.data.date as string | undefined) ?? r.created_at;
        return new Date(raw).toDateString();
      }),
    );

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay();

    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
      <div className="rounded-lg border border-border bg-card/70 p-4">
        <div className="mb-2 text-sm font-medium">
          {firstDay.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-muted-foreground">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const marked = markedDates.has(new Date(year, month, day).toDateString());
            return (
              <div
                key={i}
                className={`aspect-square rounded flex items-center justify-center ${
                  marked ? "text-white" : "bg-accent"
                }`}
                style={marked ? { backgroundColor: themeColor ?? "var(--fresh)" } : undefined}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.display === "table") {
    const columns = rows.length > 0 ? Object.keys(rows[0].data) : [];
    return (
      <div className="overflow-x-auto rounded-[20px] border border-border bg-card/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-accent">
              {columns.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>
              ))}
              {(onDelete || onToggle) && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                {columns.map((c) => (
                  <td key={c} className="px-3 py-2">{String(r.data[c])}</td>
                ))}
                {(onDelete || onToggle) && (
                  <td className="px-3 py-2">
                    <RowActions
                      rowId={r.id}
                      toggleField={toggleField}
                      toggleValue={toggleField ? r.data[toggleField] : undefined}
                      onToggle={onToggle}
                      onDelete={onDelete}
                    />
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-muted-foreground">No records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // list (default)
  return (
    <ul className="divide-y divide-border rounded-[20px] border border-border bg-card/70">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
          <span>{Object.entries(r.data).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>
          <RowActions
            rowId={r.id}
            toggleField={toggleField}
            toggleValue={toggleField ? r.data[toggleField] : undefined}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        </li>
      ))}
      {rows.length === 0 && (
        <li className="px-3 py-4 text-sm text-muted-foreground">No records yet.</li>
      )}
    </ul>
  );
}
