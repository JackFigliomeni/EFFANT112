import type { ViewBlock } from "@/lib/schema";

type Row = { id: string; data: Record<string, unknown>; created_at: string };

export function ViewBlockRenderer({ block, rows }: { block: ViewBlock; rows: Row[] }) {
  if (block.display === "count") {
    return (
      <div className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black/20">
        <div className="text-3xl font-semibold">{rows.length}</div>
        <div className="text-sm text-black/60 dark:text-white/60">records in &ldquo;{block.source}&rdquo;</div>
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
      <div className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black/20">
        <div className="mb-2 text-sm font-medium">
          {firstDay.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-black/40 dark:text-white/40">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const marked = markedDates.has(new Date(year, month, day).toDateString());
            return (
              <div
                key={i}
                className={`aspect-square rounded flex items-center justify-center ${
                  marked ? "bg-emerald-500 text-white" : "bg-black/5 dark:bg-white/10"
                }`}
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
      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black/5 dark:bg-white/10">
              {columns.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-black/10 dark:border-white/10">
                {columns.map((c) => (
                  <td key={c} className="px-3 py-2">{String(r.data[c])}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-black/50 dark:text-white/50">No records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // list (default)
  return (
    <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
      {rows.map((r) => (
        <li key={r.id} className="px-3 py-2 text-sm">
          {Object.entries(r.data).map(([k, v]) => `${k}: ${v}`).join(" · ")}
        </li>
      ))}
      {rows.length === 0 && (
        <li className="px-3 py-4 text-sm text-black/50 dark:text-white/50">No records yet.</li>
      )}
    </ul>
  );
}
