"use client";

import { useState, type PointerEvent } from "react";

type MiniChartProps = { data: number[]; dates?: string[]; color: string; id: string; detailed?: boolean };

const formatValue = (value: number) => new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

const shortDate = (date?: string) => date ? date.slice(5).replace("-", "/") : "";

export function MiniChart({ data, dates = [], color, id, detailed = false }: MiniChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = detailed ? 420 : 180;
  const height = detailed ? 250 : 56;
  const left = detailed ? 64 : 3;
  const right = detailed ? 8 : 3;
  const top = detailed ? 12 : 3;
  const bottom = detailed ? 30 : 3;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = left + (index / Math.max(data.length - 1, 1)) * plotWidth;
    const y = top + (1 - (value - min) / range) * plotHeight;
    return { x, y };
  });
  const pointString = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = `${left},${height - bottom} ${pointString} ${width - right},${height - bottom}`;
  const activeIndex = detailed ? hoveredIndex ?? data.length - 1 : null;
  const activePoint = activeIndex === null ? undefined : points[activeIndex];
  const yTicks = Array.from({ length: 5 }, (_, index) => max - (range * index) / 4);
  const dateIndexes = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])];

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!detailed) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * width;
    const ratio = Math.max(0, Math.min(1, (x - left) / plotWidth));
    setHoveredIndex(Math.round(ratio * (data.length - 1)));
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="价格趋势图，可移动指针查看每日价格" className="h-full w-full overflow-visible touch-pan-y" onPointerMove={handlePointerMove} onPointerLeave={() => setHoveredIndex(null)}>
      <defs><linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {detailed && yTicks.map((value, index) => {
        const y = top + (plotHeight * index) / 4;
        return <g key={value}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#557567" strokeDasharray="4 6" /><text x={left - 8} y={y + 4} fill="#aac0b5" fontSize="11" textAnchor="end" className="tabular-nums">{formatValue(value)}</text></g>;
      })}
      <polygon points={area} fill={`url(#fill-${id})`} />
      <polyline points={pointString} fill="none" stroke={color} strokeWidth={detailed ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" />
      {detailed && dateIndexes.map((index) => <text key={index} x={points[index].x} y={height - 5} fill="#aac0b5" fontSize="11" textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}>{shortDate(dates[index])}</text>)}
      {detailed && activePoint && activeIndex !== null && <g pointerEvents="none">
        <line x1={activePoint.x} x2={activePoint.x} y1={top} y2={height - bottom} stroke="#dbe8e1" strokeDasharray="3 4" />
        <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="#173f2e" stroke={color} strokeWidth="3" />
        <g transform={`translate(${activePoint.x > width - 140 ? activePoint.x - 136 : activePoint.x + 10},${activePoint.y < 62 ? activePoint.y + 10 : activePoint.y - 52})`}>
          <rect width="126" height="42" rx="7" fill="#f8faf8" stroke="#d8e3dc" />
          <text x="9" y="16" fill="#6c7d73" fontSize="10">{dates[activeIndex] ?? "历史价格"}</text>
          <text x="9" y="33" fill="#173f2e" fontSize="13" fontWeight="600" className="tabular-nums">{formatValue(data[activeIndex])}</text>
        </g>
      </g>}
    </svg>
  );
}