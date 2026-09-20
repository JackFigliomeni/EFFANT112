"use client";

export const ACCENT_SWATCHES = ["#171717", "#d0452b", "#e8833a", "#e2b93b", "#3ea96b", "#2fa6b8", "#3b82f6", "#7c5cd6", "#d94f8c"];

/** The tool's accent color: used for its buttons, marked days, chart bars, and its app icon. */
export function AccentPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {ACCENT_SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Accent ${c}`}
          onClick={() => onChange(c)}
          className={`size-8 rounded-full shadow-soft transition-transform hover:scale-110 ${
            value.toLowerCase() === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
      <label className="relative size-8 cursor-pointer overflow-hidden rounded-full border border-border shadow-soft" title="Custom color">
        <span
          className="absolute inset-0"
          style={{ background: "conic-gradient(from 0deg, #d0452b, #e2b93b, #3ea96b, #3b82f6, #7c5cd6, #d0452b)" }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label="Custom accent color"
        />
      </label>
    </div>
  );
}
