"use client";

// 五角大楼披萨指数 — 地缘政治民间情报指标
// 追踪五角大楼周边披萨订单量异动，预警重大军事行动

const alerts = [
  { level: 3, label: "高", color: "#c0392b", bg: "bg-[#fdecea]", desc: "订单量激增，可能预示重大军事行动" },
  { level: 2, label: "中", color: "#e67e22", bg: "bg-[#fef3e2]", desc: "订单量异常上升，需持续关注" },
  { level: 1, label: "低", color: "#27ae60", bg: "bg-[#e8f5e9]", desc: "订单量正常，无明显异常" },
] as const;

const historicalCases = [
  { date: "1989.12", event: "美国入侵巴拿马", detail: "五角大楼披萨配送量显著上升，'披萨指数'概念首次被记录" },
  { date: "1990.08", event: "海湾战争前夕", detail: "达美乐华盛顿特区负责人发现国防部、CIA、白宫订单突增" },
  { date: "1991.01", event: "沙漠风暴行动", detail: "发起前夜订单量再次激增" },
  { date: "2024.10", event: "以色列袭击伊朗", detail: "五角大楼周边达美乐外卖订单异常增长" },
  { date: "2026.01", event: "美国袭击委内瑞拉", detail: "周边披萨订单量上升，Papa John客流暴增1250%" },
  { date: "2026.02", event: "五角大楼指数飙涨", detail: "District Pizza Palace活动量飙升至250%，警戒等级3级" },
];

const faq = [
  { q: "什么是披萨指数？", a: "冷战时期苏联情报部门发现，华盛顿披萨外卖变化能反映美国政府是否在加班工作。五角大楼及周边机构员工在重大危机时会留在办公室，导致披萨订单激增。" },
  { q: "为什么是披萨？", a: "披萨是美国人加班时最常点的快餐，方便分享且能长时间保温。政府大楼内通常没有披萨销售点，员工只能叫外卖。" },
  { q: "如何追踪？", a: "开源情报爱好者通过 Google Maps 等平台的「热门时段」实时数据，观察五角大楼周边披萨店在非正常时段的繁忙程度。" },
];

function LevelBadge({ level }: { level: number }) {
  const alert = alerts.find((a) => a.level === level) ?? alerts[2];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${alert.bg}`} style={{ color: alert.color }}>
      <i className="size-1.5 rounded-full" style={{ backgroundColor: alert.color }} />
      {alert.label}警戒
    </span>
  );
}

export function PentagonPizzaCard() {
  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-[#ddd9ce] bg-[#faf9f5] p-6 lg:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#5b5a4a]">PENTAGON PIZZA INDEX</p>
          <h2 className="mt-2 text-xl font-semibold">五角大楼披萨指数</h2>
          <p className="mt-1 text-sm text-[#707771]">地缘政治民间情报指标 · 追踪军方加班异动</p>
        </div>
        <div className="flex items-center gap-3">
          <LevelBadge level={1} />
          <a href="https://www.pentagonpizza.com" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#173f2e] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#1e5539]">
            实时追踪 ↗
          </a>
        </div>
      </div>

      {/* Concept */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <h3 className="mb-3 text-sm font-semibold text-[#2b332d]">核心原理</h3>
          <ul className="space-y-2.5 text-xs leading-5 text-[#4a5249]">
            <li className="flex gap-2"><span className="mt-1 size-1 shrink-0 rounded-full bg-[#b6b0a0]" /><span>五角大楼及政府机构员工在重大危机时持续加班</span></li>
            <li className="flex gap-2"><span className="mt-1 size-1 shrink-0 rounded-full bg-[#b6b0a0]" /><span>加班导致周边披萨外卖需求激增</span></li>
            <li className="flex gap-2"><span className="mt-1 size-1 shrink-0 rounded-full bg-[#b6b0a0]" /><span>通过 Google Maps 等公开数据监测店铺繁忙程度</span></li>
            <li className="flex gap-2"><span className="mt-1 size-1 shrink-0 rounded-full bg-[#b6b0a0]" /><span>冷战时期苏联情报部门已用此方法评估美国军事动向</span></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-[#2b332d]">历史验证案例</h3>
          <div className="space-y-3">
            {historicalCases.map((c) => (
              <div key={c.date} className="flex items-start gap-3 rounded-lg border border-[#e5e2d8] bg-white/60 p-3">
                <span className="shrink-0 rounded bg-[#e6e3da] px-2 py-0.5 text-[11px] font-medium text-[#5b5a4a]">{c.date}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#2b332d]">{c.event}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#8b908c]">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-6 border-t border-[#e5e2d8] pt-5">
        <h3 className="mb-3 text-sm font-semibold text-[#2b332d]">常见问题</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {faq.map((item) => (
            <div key={item.q} className="rounded-lg bg-white/60 p-3">
              <p className="text-xs font-semibold text-[#173f2e]">{item.q}</p>
              <p className="mt-1.5 text-[11px] leading-4 text-[#707771]">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 text-[11px] text-[#8b908c]">五角大楼披萨指数为民间开源情报指标，非官方数据，仅供参考，不构成任何投资建议</p>
    </section>
  );
}
