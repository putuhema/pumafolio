import {
  BODY,
  EAR_L,
  EAR_R,
  FROWN,
  INK,
  PAPER,
  SMILE,
  TAIL,
  TAN,
  star,
} from "./puma-paths";

export type PumaExpression =
  | "idle"
  | "happy"
  | "listening"
  | "thinking"
  | "talking"
  | "idea"
  | "confused"
  | "sleepy";

type Props = {
  expression?: PumaExpression;
  size?: number;
  title?: string;
};

const VB_W = 200;
const VB_H = 250;

function DotEyes({
  r = 5.6,
  leftY = 112,
  rightY = 112,
  leftR,
}: {
  r?: number;
  leftY?: number;
  rightY?: number;
  leftR?: number;
}) {
  return (
    <g fill={INK}>
      <circle cx="76" cy={leftY} r={leftR ?? r} />
      <circle cx="124" cy={rightY} r={r} />
    </g>
  );
}

function Nose() {
  return <path fill={INK} d="M100 134 L96.2 141.2 Q100 144 103.8 141.2 Z" />;
}

function Mouth({ expression }: { expression: PumaExpression }) {
  if (expression === "talking") {
    return (
      <ellipse
        className="mouth-open"
        cx="100"
        cy="158"
        rx="10"
        ry="8.5"
        fill={INK}
      />
    );
  }
  if (expression === "listening") {
    return <ellipse cx="100" cy="156" rx="4.2" ry="3.4" fill={INK} />;
  }
  if (expression === "confused") {
    return (
      <path
        d={FROWN}
        fill="none"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    );
  }
  if (expression === "thinking") {
    return (
      <path
        d="M92 154 H108"
        fill="none"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    );
  }
  return (
    <path
      d={SMILE}
      fill="none"
      stroke={INK}
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  );
}

function Eyes({ expression }: { expression: PumaExpression }) {
  const up = expression === "thinking";
  return (
    <g className={up ? "eyes eyes-up" : "eyes"}>
      {expression === "happy" ? (
        <g fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round">
          <path d="M64 114 Q76 102 88 114" />
          <path d="M112 114 Q124 102 136 114" />
        </g>
      ) : null}
      {expression === "idea" ? (
        <g fill={INK}>
          <path d={star(76, 110, 8)} />
          <path d={star(124, 110, 8)} />
        </g>
      ) : null}
      {expression === "idle" || expression === "talking" ? <DotEyes /> : null}
      {expression === "listening" ? <DotEyes r={8} /> : null}
      {expression === "thinking" ? <DotEyes /> : null}
      {expression === "confused" ? (
        <DotEyes r={5.4} leftY={106} leftR={4.4} />
      ) : null}
    </g>
  );
}

function SittingFace({ expression }: { expression: PumaExpression }) {
  return (
    <g>
      <Eyes expression={expression} />
      <Nose />
      <Mouth expression={expression} />
    </g>
  );
}

function Extras({ expression }: { expression: PumaExpression }) {
  if (expression === "thinking") {
    return (
      <g className="dots" fill={INK}>
        <circle className="dot" cx="150" cy="8" r="3.2" />
        <circle className="dot" cx="164" cy="2" r="3.2" />
        <circle className="dot" cx="178" cy="8" r="3.2" />
      </g>
    );
  }
  if (expression === "idea") {
    return (
      <g className="bulb">
        <path
          d="M168 6 V0 M184 16 L190 10 M152 16 L146 10 M190 34 H196 M146 34 H140"
          fill="none"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="168"
          cy="34"
          r="11"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2"
        />
        <rect x="163" y="44" width="10" height="3.5" rx="1" fill={INK} />
        <rect x="164.5" y="48.5" width="7" height="2.6" rx="0.8" fill={INK} />
      </g>
    );
  }
  if (expression === "confused") {
    return (
      <text
        x="162"
        y="36"
        fill={INK}
        fontSize="26"
        fontFamily="ui-monospace, monospace"
        fontWeight="700"
      >
        ?
      </text>
    );
  }
  return null;
}

function Sleepy() {
  return (
    <g>
      <g className="body-wrap">
        <ellipse cx="128" cy="148" rx="62" ry="36" fill={TAN} />
        <circle cx="68" cy="140" r="40" fill={TAN} />
        <path
          fill={TAN}
          d="M46 118 C40 96 52 82 66 80 C78 78 86 96 82 116 Z"
        />
        <path
          fill={TAN}
          d="M78 108 C84 88 100 82 108 94 C112 104 100 118 88 120 Z"
        />
        <ellipse
          cx="186"
          cy="156"
          rx="14"
          ry="9"
          transform="rotate(-18 186 156)"
          fill={TAN}
        />
        <g className="eyes">
          <path
            d="M52 136 Q60 142 68 136"
            fill="none"
            stroke={INK}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M74 136 Q82 142 90 136"
            fill="none"
            stroke={INK}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <ellipse cx="70" cy="152" rx="3.2" ry="2.2" fill={INK} />
        </g>
      </g>
      <g
        className="zzz"
        fill={INK}
        fontFamily="ui-monospace, monospace"
        fontWeight="700"
      >
        <text x="112" y="86" fontSize="16">
          z
        </text>
        <text x="132" y="68" fontSize="22">
          z
        </text>
      </g>
    </g>
  );
}

export function PumaSvg({ expression = "idle", size = 120, title }: Props) {
  const height = Math.round((size * VB_H) / VB_W);
  return (
    <svg
      className="puma"
      data-expression={expression}
      width={size}
      height={height}
      viewBox={`0 -16 ${VB_W} ${VB_H}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {expression === "sleepy" ? (
        <Sleepy />
      ) : (
        <g className="body-wrap">
          <path className="tail" fill={TAN} d={TAIL} />
          <path className="ear ear-l" fill={TAN} d={EAR_L} />
          <path className="ear ear-r" fill={TAN} d={EAR_R} />
          <path className="body" fill={TAN} d={BODY} />
          <SittingFace expression={expression} />
          <Extras expression={expression} />
        </g>
      )}
    </svg>
  );
}
