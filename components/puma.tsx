"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { PumaSvg, type PumaExpression } from "./puma-svg";

type Props = {
  expression?: PumaExpression;
  size?: number;
  className?: string;
  title?: string;
};

function motionFor(expression: PumaExpression) {
  switch (expression) {
    case "talking":
      return {
        scaleX: [1, 1.05, 0.975, 1.035, 1],
        scaleY: [1, 0.93, 1.06, 0.97, 1],
      };
    case "idea":
      return {
        y: [0, -8, 0],
        scaleX: [1, 0.96, 1],
        scaleY: [1, 1.05, 1],
      };
    case "confused":
      return { rotate: [-2, -6, -2] };
    case "listening":
      return { scale: [1, 1.03, 1] };
    case "sleepy":
      return { scaleY: [1, 1.02, 1], scaleX: [1, 0.985, 1] };
    default:
      return { scaleX: [1, 1.02, 1], scaleY: [1, 0.985, 1] };
  }
}

function transitionFor(expression: PumaExpression) {
  if (expression === "talking") {
    return { duration: 0.42, repeat: Infinity, ease: "easeInOut" as const };
  }
  if (expression === "idea") {
    return { duration: 0.65, ease: "easeOut" as const };
  }
  if (expression === "confused") {
    return { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const };
  }
  return { duration: 3.6, repeat: Infinity, ease: "easeInOut" as const };
}

export function Puma({
  expression = "idle",
  size = 120,
  className,
  title,
}: Props) {
  const reduce = useReducedMotion();
  const animate = useMemo(
    () => (reduce === false ? motionFor(expression) : { scale: 1 }),
    [reduce, expression],
  );
  const transition = useMemo(
    () => (reduce === false ? transitionFor(expression) : { duration: 0 }),
    [reduce, expression],
  );

  return (
    <motion.span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, originY: 0.9 }}
      animate={animate}
      transition={transition}
    >
      <PumaSvg expression={expression} size={size} title={title} />
    </motion.span>
  );
}

export type { PumaExpression };
