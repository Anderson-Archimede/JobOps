/**
 * FuturisticRadar — SVG radar chart with a sci-fi / data-analyst aesthetic.
 * Draws concentric hexagon rings, animated profile polygon, axis glow dots.
 */

import React, { useEffect, useRef, useState } from "react";

export interface RadarDataPoint {
  label: string;
  value: number;   // 0–4
  target: number;  // 0–4 (market target)
}

interface Props {
  data: RadarDataPoint[];
  size?: number;
}

const MAX = 4;
const RINGS = 4;

function toXY(angle: number, r: number, cx: number, cy: number) {
  return {
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  };
}

function polygonPoints(values: number[], R: number, cx: number, cy: number, n: number): string {
  return values
    .map((v, i) => {
      const angle = (2 * Math.PI * i) / n;
      const r = (v / MAX) * R;
      const { x, y } = toXY(angle, r, cx, cy);
      return `${x},${y}`;
    })
    .join(" ");
}

const LEVEL_LABEL = ["", "Notions", "Inter.", "Avancé", "Expert"];

export const FuturisticRadar: React.FC<Props> = ({ data, size = 440 }) => {
  const n = data.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.36;
  const labelR = R + 28;

  const [animProgress, setAnimProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const DURATION = 900;

  useEffect(() => {
    startRef.current = null;
    setAnimProgress(0);
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const p = Math.min(elapsed / DURATION, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimProgress(eased);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [data]);

  const profileValues = data.map((d) => d.value * animProgress);
  const targetValues = data.map((d) => d.target);

  const profilePoly = polygonPoints(profileValues, R, cx, cy, n);
  const targetPoly = polygonPoints(targetValues, R, cx, cy, n);

  const uid = "frd";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="w-full"
      style={{ maxWidth: size }}
    >
      <defs>
        {/* Teal gradient for profile polygon */}
        <radialGradient id={`${uid}-grad`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#0d9488" stopOpacity={0.15} />
        </radialGradient>
        {/* Outer glow filter */}
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Dot glow */}
        <filter id={`${uid}-dot`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ─── background rings ─────────────────────────────── */}
      {Array.from({ length: RINGS }).map((_, ri) => {
        const r = (R * (ri + 1)) / RINGS;
        const ringPoints = Array.from({ length: n })
          .map((__, i) => {
            const angle = (2 * Math.PI * i) / n;
            const { x, y } = toXY(angle, r, cx, cy);
            return `${x},${y}`;
          })
          .join(" ");
        const isMax = ri === RINGS - 1;
        return (
          <polygon
            key={ri}
            points={ringPoints}
            fill="none"
            stroke={isMax ? "rgba(45,212,191,0.35)" : "rgba(45,212,191,0.12)"}
            strokeWidth={isMax ? 1.2 : 0.8}
            strokeDasharray={isMax ? "none" : "3 4"}
          />
        );
      })}

      {/* ─── axis lines ───────────────────────────────────── */}
      {data.map((_, i) => {
        const angle = (2 * Math.PI * i) / n;
        const { x, y } = toXY(angle, R, cx, cy);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="rgba(45,212,191,0.20)"
            strokeWidth={0.8}
          />
        );
      })}

      {/* ─── ring level tick labels ────────────────────────── */}
      {Array.from({ length: RINGS }).map((_, ri) => {
        const r = (R * (ri + 1)) / RINGS;
        const { x, y } = toXY(0, r, cx, cy);
        return (
          <text
            key={ri}
            x={x + 4}
            y={y}
            fontSize={8}
            fill="rgba(100,255,218,0.35)"
            dominantBaseline="middle"
          >
            {LEVEL_LABEL[ri + 1]}
          </text>
        );
      })}

      {/* ─── target polygon (market) ──────────────────────── */}
      <polygon
        points={targetPoly}
        fill="none"
        stroke="rgba(148,163,184,0.4)"
        strokeWidth={1.4}
        strokeDasharray="6 4"
      />

      {/* ─── profile polygon fill ─────────────────────────── */}
      <polygon
        points={profilePoly}
        fill={`url(#${uid}-grad)`}
        stroke="none"
      />
      {/* ─── profile polygon stroke with glow ─────────────── */}
      <polygon
        points={profilePoly}
        fill="none"
        stroke="#2dd4bf"
        strokeWidth={2.2}
        filter={`url(#${uid}-glow)`}
      />

      {/* ─── axis dot + value label ───────────────────────── */}
      {data.map((d, i) => {
        const angle = (2 * Math.PI * i) / n;
        const dotR = (d.value / MAX) * R;
        const { x: dotX, y: dotY } = toXY(angle, dotR * animProgress, cx, cy);

        return (
          <g key={i}>
            {d.value > 0 && (
              <>
                <circle
                  cx={dotX}
                  cy={dotY}
                  r={4}
                  fill="#2dd4bf"
                  filter={`url(#${uid}-dot)`}
                />
                <circle cx={dotX} cy={dotY} r={2.5} fill="white" />
              </>
            )}
          </g>
        );
      })}

      {/* ─── axis labels ──────────────────────────────────── */}
      {data.map((d, i) => {
        const angle = (2 * Math.PI * i) / n;
        const { x: lx, y: ly } = toXY(angle, labelR, cx, cy);
        const isTop = ly < cy - R * 0.2;
        const isBottom = ly > cy + R * 0.2;
        const anchor = lx < cx - 4 ? "end" : lx > cx + 4 ? "start" : "middle";
        const dyOffset = isTop ? -6 : isBottom ? 6 : 0;
        const levelIdx = Math.round(d.value);
        const levelColor = ["#64748b", "#60a5fa", "#34d399", "#a78bfa", "#f59e0b"][levelIdx] ?? "#64748b";

        return (
          <g key={i}>
            <text
              x={lx}
              y={ly + dyOffset}
              textAnchor={anchor}
              fontSize={11}
              fontWeight={600}
              fill="rgba(226,232,240,0.9)"
              letterSpacing={0.3}
            >
              {d.label}
            </text>
            {d.value > 0 && (
              <text
                x={lx}
                y={ly + dyOffset + 13}
                textAnchor={anchor}
                fontSize={9}
                fill={levelColor}
                fontWeight={500}
              >
                {LEVEL_LABEL[levelIdx] ?? ""}
              </text>
            )}
          </g>
        );
      })}

      {/* ─── center dot ───────────────────────────────────── */}
      <circle cx={cx} cy={cy} r={3} fill="#0d9488" />
      <circle cx={cx} cy={cy} r={1.5} fill="white" opacity={0.8} />
    </svg>
  );
};
