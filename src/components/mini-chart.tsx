type MiniChartProps = { data: number[]; color: string; id: string; detailed?: boolean };

export function MiniChart({ data, color, id, detailed = false }: MiniChartProps) {
  const width = detailed ? 760 : 180;
  const height = detailed ? 250 : 56;
  const padding = detailed ? 12 : 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  const area = `${padding},${height} ${points.join(" ")} ${width - padding},${height}`;
  const [lastX, lastY] = points.at(-1)?.split(",") ?? [0, 0];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="价格趋势图" className="h-full w-full overflow-visible">
      <defs><linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {detailed && [0.2, 0.5, 0.8].map((line) => <line key={line} x1="0" x2={width} y1={height * line} y2={height * line} stroke="#557567" strokeDasharray="4 6" />)}
      <polygon points={area} fill={`url(#fill-${id})`} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={detailed ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" />
      {detailed && <circle cx={lastX} cy={lastY} r="5" fill="#173f2e" stroke={color} strokeWidth="3" />}
    </svg>
  );
}