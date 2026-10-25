export const TAN = "#C19A6B";
export const INK = "#141414";
export const PAPER = "#fafaf8";

/** Sitting bean. Wider at the hip, round at the base, no limbs. */
export const BODY =
  "M100 52C66 50 42 82 42 122C42 168 62 206 100 218C138 206 158 168 158 122C158 82 134 50 100 52Z";

export const EAR_L =
  "M74 66C70 46 56 28 66 14C76 2 96 16 100 38C102 52 92 64 80 68Z";

export const EAR_R =
  "M126 66C130 46 144 28 134 14C124 2 104 16 100 38C98 52 108 64 120 68Z";

export const TAIL =
  "M146 174C164 166 188 176 186 194C184 208 164 210 152 198C142 188 140 180 146 174Z";

export const SMILE = "M84 152Q100 168 116 152";

export const FROWN = "M88 162Q100 150 112 162";

export function star(cx: number, cy: number, r: number) {
  const inner = r * 0.34;
  return `M ${cx} ${cy - r} L ${cx + inner} ${cy - inner} L ${cx + r} ${cy} L ${cx + inner} ${cy + inner} L ${cx} ${cy + r} L ${cx - inner} ${cy + inner} L ${cx - r} ${cy} L ${cx - inner} ${cy - inner} Z`;
}
