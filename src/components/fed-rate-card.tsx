import { MiniChart } from "@/components/mini-chart";
import type { FedRateProbability } from "@/lib/macro";

const probabilityItems = [
  { key: "hike", label: "加息", color: "#a8792d" },
  { key: "hold", label: "维持", color: "#3f8060" },
  { key: "cut", label: "降息", color: "#a85b4c" },
] as const;

export function FedRateCard({ data }: { data: FedRateProbability }) {
  return (
    <section id="fed-rate" className="mb-8 overflow-hidden rounded-2xl border border-[#ddd9ce] bg-[#faf9f5] p-6 lg:grid lg:grid-cols-[1fr_0.8fr] lg:gap-10 lg:p-7">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-semibold tracking-[0.16em] text-[#9a7229]">FED POLICY EXPECTATIONS</p><h2 className="mt-2 text-xl font-semibold">美联储加息概率</h2></div>
          <span className="rounded-full bg-[#eee9dc] px-3 py-1.5 text-xs text-[#735c2f]">{data.meeting}</span>
        </div>
        <div className="mt-7 flex items-end gap-3"><strong className="text-4xl font-semibold tabular-nums text-[#9a7229]">{data.hike.toFixed(1)}%</strong><span className="pb-1 text-sm text-[#717873]">下一次会议加息概率</span></div>
        <div className="mt-6 h-20"><MiniChart data={data.history.map((item) => item.hike)} color="#a8792d" id="fed-rate-history" /></div>
        <p className="mt-3 text-[11px] text-[#8b908c]">快照日期 {data.date} · 基于 Fed Funds 期货的市场隐含概率</p>
      </div>
      <div className="mt-7 space-y-5 border-t border-[#e0ddd3] pt-7 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-1">
        {probabilityItems.map((item) => {
          const value = data[item.key];
          return <div key={item.key}><div className="mb-2 flex justify-between text-sm"><span>{item.label}</span><span className="font-semibold tabular-nums">{value.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#e8e5dc]"><div className="h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: item.color }} /></div></div>;
        })}
        <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex text-xs font-medium text-[#806225] underline decoration-[#c8b27e] underline-offset-4">查看概率计算来源（非 CME 官方 API）</a>
      </div>
    </section>
  );
}