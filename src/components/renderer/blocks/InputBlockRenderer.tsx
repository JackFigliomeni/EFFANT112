import type { InputBlock } from "@/lib/schema";

const fieldClass =
  "rounded-xl border border-border bg-card/60 px-3 py-2 text-sm outline-none transition-colors focus:border-foreground";

export function InputBlockRenderer({
  block,
  value,
  onChange,
}: {
  block: InputBlock;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (block.kind) {
    case "boolean":
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5"
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className={fieldClass}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
      );

    case "time":
      return (
        <input
          type="time"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
      );

    case "email":
      return (
        <input
          type="email"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
      );

    case "url":
      return (
        <input
          type="url"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
      );

    case "textarea":
      return (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={fieldClass}
        />
      );

    case "select":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        >
          <option value="" disabled>
            Choose…
          </option>
          {(block.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-3">
          {(block.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) =>
                  onChange(
                    e.target.checked ? [...selected, opt] : selected.filter((o) => o !== opt),
                  )
                }
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    case "rating": {
      const rating = (value as number) ?? 0;
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`text-2xl leading-none ${n <= rating ? "text-amber-500" : "text-border"}`}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>
      );
    }

    case "text":
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
      );
  }
}
