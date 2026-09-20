"use client";

import { useMemo, useState } from "react";
import type { EconomicEventPoint } from "@/lib/macro";

// A股日历四类事件的展示配色（沿用站内红涨绿跌以外的中性米绿色系）
const categoryStyles: Record<EconomicEventPoint["category"], { className: string }> = {
  "新股申购": { className: "bg-[#e4ece7] text-[#41705a]" },
  "限售解禁": { className: "bg-[#f4e2de] text-[#a65042]" },
  "分红除权": { className: "bg-[#f2ecdb] text-[#8a6a2a]" },
  "宏观数据": { className: "bg-[#e6e9f0] text-[#4a5d82]" },
};

const filters = ["全部", "新股申购", "限售解禁", "分红除权", "宏观数据"] as const;

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function EconomicEventsCard({ events }: { events: EconomicEventPoint[] }) {
  const [categoryFilter, setCategoryFilter] = useState<(typeof filters)[number]>("全部");

  const days = useMemo(() => {
    const filtered = categoryFilter === "全部" ? events : events.filter((event) => event.category === categoryFilter);
    const grouped = new Map<string, EconomicEventPoint[]>();
    for (const event of filtered) {
      const list = grouped.get(event.date) ?? [];
      list.push(event);
      grouped.set(event.date, list);
    }
    // 展示时间倒序：日期从新到旧；同一天内按"新股 → 解禁 → 分红 → 宏观"排列
    const categoryOrder: Record<EconomicEventPoint["category"], number> = { "新股申购": 0, "限售解禁": 1, "分红除权": 2, "宏观数据": 3 };
    return [...grouped.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, dayEvents]): [string, EconomicEventPoint[]] => [date, [...dayEvents].sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category])]);
  }, [events, categoryFilter]);

  const counts = useMemo(() => {
    const map = { 新股申购: 0, 限售解禁: 0, 分红除权: 0, 宏观数据: 0 } as Record<EconomicEventPoint["category"], number>;
    for (const event of events) map[event.category] += 1;
    return map;
  }, [events]);

  return (
    <section id="economic-events" className="mb-8 overflow-hidden rounded-2xl border border-[#ddd9ce] bg-[#faf9f5] p-6 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#5b5a4a]">A-SHARE CALENDAR</p>
          <h2 className="mt-2 text-xl font-semibold">A股事件一览</h2>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-[#e6e3da] p-1">
          {filters.map((item) => (
            <button key={item} onClick={() => setCategoryFilter(item)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${categoryFilter === item ? "bg-white text-[#173f2e] shadow-sm" : "text-[#777d79] hover:text-[#173f2e]"}`}>
              {item === "全部" ? `全部 ${events.length}` : `${item} ${counts[item]}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {days.map(([date, dayEvents]) => (
          <div key={date} className="rounded-xl border border-[#e5e2d8] bg-white/60 p-4">
            <div className="mb-3 flex items-baseline justify-between border-b border-[#e5e2d8] pb-2">
              <span className="text-sm font-semibold">{date.replaceAll("-", "/")} {weekdayLabel(date)}</span>
              <span className="text-[11px] text-[#8b908c]">{dayEvents.length} 项</span>
            </div>
            <ul className="space-y-3">
              {dayEvents.map((event, index) => (
                <li key={`${event.date}-${event.title}-${index}`} className="flex items-start gap-2.5">
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${categoryStyles[event.category].className}`}>{event.category}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#2b332d]">{event.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#8b908c]">{event.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {days.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-[#cecabe] py-10 text-center text-sm text-[#808681]">该分类暂无事件</div>}
      </div>

      <p className="mt-5 text-[11px] text-[#8b908c]">数据来自东方财富数据中心（新股申购、限售解禁、分红送配、财经日历）；限售解禁按解禁市值取前 10，分红除权按分红金额取前 10；仅供参考，不构成任何投资建议</p>
    </section>
  );
}
