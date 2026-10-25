import { ImageResponse } from "next/og";
import { BODY, EAR_L, EAR_R, INK, TAN } from "@/components/puma-paths";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#fafaf8",
        }}
      >
        <svg width="32" height="32" viewBox="42 0 116 132">
          <path fill={TAN} d={EAR_L} />
          <path fill={TAN} d={EAR_R} />
          <path fill={TAN} d={BODY} />
          <circle cx="76" cy="104" r="8.5" fill={INK} />
          <circle cx="124" cy="104" r="8.5" fill={INK} />
          <path fill={INK} d="M100 118 L96 126 Q100 129 104 126 Z" />
          <path
            d="M84 128 Q100 140 116 128"
            fill="none"
            stroke={INK}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
