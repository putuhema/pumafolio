import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Putu Mahendra, full-stack and AI engineer";
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
          flexDirection: "column",
          justifyContent: "center",
          background: "#fafaf8",
          color: "#141414",
          padding: "80px 88px",
          fontFamily: "IBM Plex Mono",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -1 }}>
          Putu Mahendra
        </div>
        <div style={{ fontSize: 32, lineHeight: 1.45, marginTop: 28, maxWidth: 860 }}>
          Full-stack & AI engineer. I build safe AI tools for hospital data.
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
