import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BODY, EAR_L, EAR_R, INK, SMILE, TAIL, TAN } from "@/components/puma-paths";

export const alt = "Putu Mahendra, with a tan puma mascot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const regular = readFile(
  join(process.cwd(), "fonts/ibm-plex-mono-latin-400-normal.woff"),
);
const bold = readFile(
  join(process.cwd(), "fonts/ibm-plex-mono-latin-700-normal.woff"),
);

export default async function OpenGraphImage() {
  const [regularData, boldData] = await Promise.all([regular, bold]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#fafaf8",
          color: "#141414",
          padding: "72px 80px",
          gap: 64,
        }}
      >
        <svg width="280" height="322" viewBox="0 0 200 230">
          <path fill={TAN} d={TAIL} />
          <path fill={TAN} d={EAR_L} />
          <path fill={TAN} d={EAR_R} />
          <path fill={TAN} d={BODY} />
          <circle cx="76" cy="112" r="6" fill={INK} />
          <circle cx="124" cy="112" r="6" fill={INK} />
          <path fill={INK} d="M100 134 L96.2 141.2 Q100 144 103.8 141.2 Z" />
          <path
            d={SMILE}
            fill="none"
            stroke={INK}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 680,
          }}
        >
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -1 }}>
            Putu Mahendra
          </div>
          <div style={{ fontSize: 32, lineHeight: 1.4 }}>
            Full-stack & AI engineer. I build safe AI tools for hospital data.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "IBM Plex Mono", data: regularData, weight: 400, style: "normal" },
        { name: "IBM Plex Mono", data: boldData, weight: 700, style: "normal" },
      ],
    },
  );
}
