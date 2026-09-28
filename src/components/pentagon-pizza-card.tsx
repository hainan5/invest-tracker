import type { PentagonPizza } from "@/lib/macro";

// 警戒等级按监测站规则判定：任一门店异常=高；最大繁忙度≥70 或深夜时段=中；其余=低
function alertLevel(data: PentagonPizza) {
  if (data.anomalyCount > 0) return { label: "高", color: "#c0392b", bg: "bg-[#fdecea]", desc: "检测到订单量异常激增，可能预示重大事件" };
  if (data.maxBusy >= 70 || data.lateNight) return { label: "中", color: "#e67e22", bg: "bg-[#fef3e2]", desc: "繁忙度异常上升，需持续关注" };
  return { label: "低", color: "#27ae60", bg: "bg-[#e8f5e9]", desc: "订单量正常，无明显异常" };
}

export function PentagonPizzaCard({ data }: { data: PentagonPizza }) {
  const alert = alertLevel(data);
  const top = data.readings.slice(0, 6);
  const maxBusy = Math.max(...data.readings.map((item) => item.busy), 1);

  return (
    <section id="pentagon-pizza" className="mb-8 overflow-hidden rounded-2xl border border-[#ddd9ce] bg-[#faf9f5] p-6 lg:grid lg:grid-cols-[1fr_0.8fr] lg:gap-10 lg:p-7">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#5b5a4a]">PENTAGON PIZZA INDEX</p>
            <h2 className="mt-2 text-xl font-semibold">五角大楼披萨指数</h2>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${alert.bg}`} style={{ color: alert.color }}>
            <i className="size-1.5 rounded-full" style={{ backgroundColor: alert.color }} />
            {alert.label}警戒
          </span>
        </div>
        <div className="mt-7 flex items-end gap-3">
          <strong className="text-4xl font-semibold tabular-nums text-[#2b332d]">{data.avgBusy.toFixed(1)}</strong>
          <span className="pb-1 text-sm text-[#717873]">平均繁忙度（%）· {data.locationCount} 家门店</span>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "最繁忙门店", value: `${data.maxBusy}%` },
            { label: "最大偏差", value: `${data.maxDeviation > 0 ? "+" : ""}${data.maxDeviation.toFixed(2)}σ` },
            { label: "异常门店", value: `${data.anomalyCount} 家` },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-[#e5e2d8] bg-white/60 p-3">
              <p className="text-[11px] text-[#8b908c]">{item.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#2b332d]">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#4a5249]">{alert.desc}</p>
        <p className="mt-3 text-[11px] text-[#8b908c]">快照时间 {data.snapshot}（北京时间）· 基于门店实时繁忙度与历史基线的偏差</p>
      </div>
      <div className="mt-7 space-y-3 border-t border-[#e0ddd3] pt-7 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-1">
        <h3 className="text-sm font-semibold text-[#2b332d]">门店繁忙度排行（前 {top.length}）</h3>
        {top.map((item) => (
          <div key={item.name}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-[#4a5249]">{item.name}</span>
              <span className={`shrink-0 font-semibold tabular-nums ${item.busy >= 70 || item.anomaly ? "text-[#a65042]" : "text-[#357452]"}`}>{item.busy}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#e6e3da]">
              <div className={`h-full rounded-full ${item.busy >= 70 || item.anomaly ? "bg-[#a65042]" : "bg-[#5f8a72]"}`} style={{ width: `${Math.round((item.busy / maxBusy) * 100)}%` }} />
            </div>
          </div>
        ))}
        <p className="pt-2 text-[11px] leading-5 text-[#8b908c]">
          五角大楼周边披萨店在重大事件时订单激增（冷战时期即被用作情报信号）。繁忙度 0–100 为相对水平，偏差为相对历史基线的标准差。数据来源为开源情报监测站，仅供娱乐参考，不构成任何投资建议。
        </p>
        <a href="https://pentagon.pizza" target="_blank" rel="noreferrer" className="inline-flex text-xs font-medium text-[#3c6e56] underline decoration-[#9dc4b2] underline-offset-4">查看数据来源（Pentagon.Pizza 实时监测）</a>
      </div>
    </section>
  );
}
