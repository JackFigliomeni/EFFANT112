// The effant "E": two rounded blocks with a dot between them. Drawn as one
// path each so it stays crisp at any size; it takes its colour from the text
// colour, so it works on light and dark backgrounds.
export const LOGO_TOP =
  "M20 0H283Q303 0 303 20V78Q303 98 283 98H98V143Q98 163 78 163H20Q0 163 0 143V20Q0 0 20 0Z";
export const LOGO_BOTTOM =
  "M20 241H212Q232 241 232 261V319Q232 339 212 339H98V406H283Q303 406 303 426V484Q303 504 283 504H20Q0 504 0 484V261Q0 241 20 241Z";

export function LogoMark({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 303 504" className={className} fill="currentColor" aria-hidden="true">
      <path d={LOGO_TOP} />
      <circle cx="49" cy="202" r="35" />
      <path d={LOGO_BOTTOM} />
    </svg>
  );
}
