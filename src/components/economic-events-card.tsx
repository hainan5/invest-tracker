"use client";

import { useMemo, useState } from "react";
import type { EconomicEventPoint } from "@/lib/macro";

const impactStyles: Record<EconomicEventPoint["impact"], { className: string }> = {
  "高": { className: "bg-[#f4e2de] text-[#a65042]" },
  "中": { className: "bg-[#f2ecdb] text-[#8a6a2a]" },
  "低": { className: "bg-[#e8e5dc] text-[#6d746f]" },
};

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function EconomicEventsCard({ events }: { events: EconomicEventPoint[] }) {
  const [impactFilter, setImpactFilter] = useState<"全部" | "高">("全部");

  const days = useMemo(() => {
    const filtered = impactFilter === "全部" ? events : events.filter((event) => event.impact === "高");
    const grouped = new Map<string, EconomicEventPoint[]>();
    for (const event of filtered) {
      const list = grouped.get(event.date) ?? [];
      list.push(event);
      grouped.set(event.date, list);
    }
    // 展示时间倒序：日期从新到旧，同一天内时间从晚到早（CSV 本身仍按时间升序存储）
    return [...grouped.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, dayEvents]): [string, EconomicEventPoint[]] => [date, [...dayEvents].reverse()]);
  }, [events, impactFilter]);

  const highCount = events.filter((event) => event.impact === "高").length;

  return (
    <section id="economic-events" className="mb-8 overflow-hidden rounded-2xl border border-[#ddd9ce] bg-[#faf9f5] p-6 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#5b5a4a]">KEY EVENTS THIS WEEK</p>
          <h2 className="mt-2 text-xl font-semibold">国内重要事件一览</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#eee9dc] px-3 py-1.5 text-xs text-[#735c2f]">{highCount} 项重要</span>
          <div className="flex gap-1 rounded-lg bg-[#e6e3da] p-1">
            {(["全部", "高"] as const).map((item) => (
              <button key={item} onClick={() => setImpactFilter(item)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${impactFilter === item ? "bg-white text-[#173f2e] shadow-sm" : "text-[#777d79] hover:text-[#173f2e]"}`}>
                {item === "全部" ? "全部" : "重要"}
              </button>
            ))}
          </div>
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
              {dayEvents.map((event, index) => {
                const impact = impactStyles[event.impact];
                return (
                  <li key={`${event.date}-${event.timeBeijing}-${index}`} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${impact.className}`}>{event.impact}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#2b332d]">{event.title}</p>
                      <p className="mt-0.5 text-[11px] text-[#8b908c]">北京时间 {event.timeBeijing}{event.eventType && ` · ${event.eventType}`}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[11px] text-[#8b908c]">时间均为北京时间；数据来自东方财富「财经日历」（data.eastmoney.com/cjrl），仅收录国内事件，“高”表示对行情可能有明确指引的关键数据或会议（如 LPR 报价、社融、M2 等），仅供参考，不构成任何投资建议</p>
    </section>
  );
}

