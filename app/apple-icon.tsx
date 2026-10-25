import { ImageResponse } from "next/og";
import { BODY, EAR_L, EAR_R, INK, SMILE, TAIL, TAN } from "@/components/puma-paths";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafaf8",
        }}
      >
        <svg width="150" height="172" viewBox="20 0 160 210">
          <path fill={TAN} d={TAIL} />
          <path fill={TAN} d={EAR_L} />
          <path fill={TAN} d={EAR_R} />
          <path fill={TAN} d={BODY} />
          <circle cx="76" cy="112" r="6" fill={INK} />
          <circle cx="124" cy="112" r="6" fill={INK} />
          <path
            d={SMILE}
            fill="none"
            stroke={INK}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
