// The design's orbit glyph, minus the pictogram icons: rings + pulsing nodes
// around an abstract core mark. Nothing here is clipped — the rings and the
// nodes' glow are allowed to extend past the box, which is what was getting
// cut off in the original.
export type CoreKind = "prompt" | "test" | "share";

function CoreMark({ kind }: { kind: CoreKind }) {
  if (kind === "prompt") {
    return (
      <svg viewBox="0 0 40 40" className="size-9" aria-hidden="true">
        <rect x="6" y="14" width="18" height="2.6" rx="1.3" fill="currentColor" opacity=".9" />
        <rect x="6" y="21" width="27" height="2.6" rx="1.3" fill="currentColor" opacity=".45" />
        <rect x="27" y="12.5" width="2.6" height="6" rx="1.3" fill="var(--signal)" style={{ animation: "caret-blink 1.1s steps(1) infinite" }} />
      </svg>
    );
  }
  if (kind === "test") {
    return (
      <svg viewBox="0 0 40 40" className="size-9" aria-hidden="true">
        <circle cx="9" cy="12" r="2.6" fill="var(--fresh)" />
        <rect x="16" y="10.7" width="17" height="2.6" rx="1.3" fill="currentColor" opacity=".55" />
        <circle cx="9" cy="20" r="2.6" fill="var(--fresh)" />
        <rect x="16" y="18.7" width="12" height="2.6" rx="1.3" fill="currentColor" opacity=".55" />
        <circle cx="9" cy="28" r="2.6" fill="var(--cool)" />
        <rect x="16" y="26.7" width="15" height="2.6" rx="1.3" fill="currentColor" opacity=".55" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className="size-9" aria-hidden="true">
      <circle cx="17" cy="21" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".7" />
      <circle cx="30" cy="12" r="3.4" fill="var(--signal)" />
    </svg>
  );
}

export function ToolGlyph({ core = "prompt", nodes = 3, compact = false }: { core?: CoreKind; nodes?: number; compact?: boolean }) {
  return (
    <div className={`tool-glyph ${compact ? "h-44" : "h-80"}`} aria-hidden="true">
      <div className="glyph-orbit-three" />
      <div className="glyph-orbit glyph-orbit-one" />
      <div className="glyph-orbit glyph-orbit-two" />
      <div className="glyph-inner-orbit" />
      <div className="glyph-core">
        <CoreMark kind={core} />
      </div>
      {Array.from({ length: Math.min(6, Math.max(2, nodes)) }).map((_, index) => (
        <span key={index} className={`glyph-node glyph-node-${(index % 6) + 1}`} />
      ))}
    </div>
  );
}
