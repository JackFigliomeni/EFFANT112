// Small abstract marks for the timeline — shapes and motion only, no
// pictograms. Each one is a picture of what that step actually does.
export type StepGlyphKind = "describe" | "draft" | "shape" | "automate" | "style" | "publish" | "install";

const S = { stroke: "var(--border)", strokeWidth: 1.4, fill: "none" } as const;

export function StepGlyph({ kind }: { kind: StepGlyphKind }) {
  return (
    <svg viewBox="0 0 120 120" className="size-28 overflow-visible" aria-hidden="true">
      {kind === "describe" && (
        <>
          <rect x="10" y="30" width="100" height="60" rx="18" {...S} />
          <rect x="24" y="52" width="42" height="4" rx="2" fill="var(--foreground)" opacity=".7" />
          <rect x="24" y="64" width="64" height="4" rx="2" fill="var(--foreground)" opacity=".3" />
          <rect x="72" y="49" width="4" height="10" rx="2" fill="var(--signal)" />
        </>
      )}
      {kind === "draft" && (
        <>
          <path d="M24 82 L52 34 L92 58 L70 96 Z M52 34 L70 96" {...S} />
          {[
            [24, 82, "var(--signal)", 0],
            [52, 34, "var(--cool)", 0.6],
            [92, 58, "var(--fresh)", 1.2],
            [70, 96, "var(--foreground)", 1.8],
          ].map(([x, y, c, d]) => (
            <circle key={`${x}-${y}`} cx={x as number} cy={y as number} r="6" fill={c as string} />
          ))}
        </>
      )}
      {kind === "shape" && (
        <>
          <rect x="14" y="28" width="60" height="14" rx="7" fill="var(--cool)" opacity=".55" />
          <rect x="30" y="52" width="76" height="14" rx="7" fill="var(--signal)" opacity=".5" />
          <rect x="14" y="76" width="44" height="14" rx="7" fill="var(--fresh)" opacity=".55" />
          <circle cx="74" cy="35" r="4" fill="var(--foreground)" />
          <circle cx="30" cy="59" r="4" fill="var(--foreground)" />
        </>
      )}
      {kind === "automate" && (
        <>
          <circle cx="60" cy="60" r="42" {...S} strokeDasharray="3 5" />
          {[0, 90, 180, 270].map((a) => (
            <circle key={a} cx={60 + 42 * Math.cos((a * Math.PI) / 180)} cy={60 + 42 * Math.sin((a * Math.PI) / 180)} r="3.5" fill="var(--border)" />
          ))}
          <g transform="rotate(35 60 60)">
            <line x1="60" y1="60" x2="60" y2="24" stroke="var(--signal)" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="60" cy="22" r="5" fill="var(--signal)" />
          </g>
          <circle cx="60" cy="60" r="4" fill="var(--foreground)" />
        </>
      )}
      {kind === "style" && (
        <g style={{ mixBlendMode: "multiply" }}>
          <circle cx="44" cy="52" r="26" fill="var(--signal)" opacity=".45" />
          <circle cx="76" cy="52" r="26" fill="var(--cool)" opacity=".45" />
          <circle cx="60" cy="78" r="26" fill="var(--fresh)" opacity=".45" />
        </g>
      )}
      {kind === "publish" && (
        <>
          {[18, 34, 50].map((r, i) => (
            <circle key={r} cx="60" cy="60" r={r} {...S} opacity={1 - i * 0.25} />
          ))}
          <circle cx="60" cy="60" r="7" fill="var(--signal)" />
          <circle cx="98" cy="30" r="4" fill="var(--cool)" />
          <circle cx="26" cy="92" r="4" fill="var(--fresh)" />
        </>
      )}
      {kind === "install" && (
        <>
          <rect x="28" y="12" width="64" height="96" rx="16" {...S} />
          <rect x="40" y="30" width="40" height="40" rx="11" fill="var(--signal)" opacity=".85" />
          <rect x="44" y="82" width="32" height="5" rx="2.5" fill="var(--foreground)" opacity=".25" />
          <rect x="50" y="96" width="20" height="3" rx="1.5" fill="var(--foreground)" opacity=".4" />
        </>
      )}
    </svg>
  );
}
