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
        <svg width="32" height="32" viewBox="36 0 128 150">
          <path fill={TAN} d={EAR_L} />
          <path fill={TAN} d={EAR_R} />
          <path fill={TAN} d={BODY} />
          <circle cx="76" cy="112" r="7" fill={INK} />
          <circle cx="124" cy="112" r="7" fill={INK} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
