export const TAN = "#C19A6B";
export const INK = "#141414";
export const PAPER = "#fafaf8";

/** Plump bean, wider through the hip. */
export const BODY =
  "M100 46C64 46 40 84 40 124C40 168 62 206 100 214C138 206 160 168 160 124C160 84 136 46 100 46Z";

/** Rounded triangle ears that sit on the head, not above it. */
export const EAR_L =
  "M78 70C70 52 52 36 60 20C70 6 96 16 104 40C108 54 96 70 84 74Z";

export const EAR_R =
  "M122 70C130 52 148 36 140 20C130 6 104 16 96 40C92 54 104 70 116 74Z";

export const TAIL =
  "M148 168C166 160 188 172 184 190C180 204 160 204 150 190C142 178 140 172 148 168Z";

export const SMILE = "M86 150Q100 166 114 150";
export const FROWN = "M88 160Q100 150 112 160";

export function star(cx: number, cy: number, r: number) {
  const inner = r * 0.34;
  return `M ${cx} ${cy - r} L ${cx + inner} ${cy - inner} L ${cx + r} ${cy} L ${cx + inner} ${cy + inner} L ${cx} ${cy + r} L ${cx - inner} ${cy + inner} L ${cx - r} ${cy} L ${cx - inner} ${cy - inner} Z`;
}
