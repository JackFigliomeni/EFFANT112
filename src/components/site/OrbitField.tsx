// The ambient bubbles behind every page except the home page (which has its
// own 3D room, see components/home/DepthRoom). Ported 1:1 from the design.
const BUBBLES = [
  "bubble bubble-a left-[-8rem] top-[5%] size-72 bg-signal/20",
  "bubble bubble-b right-[-10rem] top-[14%] size-96 bg-cool/18",
  "bubble bubble-c left-[26%] top-[3%] size-56 bg-fresh/18",
  "bubble bubble-d right-[16%] top-[42%] size-64 bg-signal/14",
  "bubble bubble-e left-[-5rem] top-[56%] size-80 bg-cool/14",
  "bubble bubble-f right-[-6rem] top-[72%] size-72 bg-fresh/18",
  "bubble bubble-g left-[38%] top-[82%] size-52 bg-signal/12",
];

export function OrbitField() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {BUBBLES.map((className) => (
        <span key={className} className={className} />
      ))}
    </div>
  );
}
