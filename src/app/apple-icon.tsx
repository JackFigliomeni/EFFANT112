import { ImageResponse } from "next/og";
import { LOGO_BOTTOM, LOGO_TOP } from "@/components/brand/LogoMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#141414", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="68" height="112" viewBox="0 0 303 504" fill="#d5d2cb">
          <path d={LOGO_TOP} />
          <circle cx="49" cy="202" r="35" />
          <path d={LOGO_BOTTOM} />
        </svg>
      </div>
    ),
    size,
  );
}
