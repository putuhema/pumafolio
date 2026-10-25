import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const bold = readFile(
  join(process.cwd(), "fonts/ibm-plex-mono-latin-700-normal.woff"),
);

export default async function AppleIcon() {
  const data = await bold;

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
          color: "#141414",
          fontSize: 96,
          fontWeight: 700,
          fontFamily: "IBM Plex Mono",
        }}
      >
        P
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "IBM Plex Mono", data, weight: 700, style: "normal" }],
    },
  );
}
