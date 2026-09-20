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
  const [showAllOnMobile, setShowAllOnMobile] = useState(false);

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
  // 移动端默认只展示重要事件，避免单列长列表刷屏；桌面端（xl 及以上）始终完整展示。
  // 用两套 DOM + Tailwind 响应式类切换，而不是按视口过滤数据，保证桌面端不受折叠状态影响
  const collapsedDays = useMemo(
    () => days
      .map(([date, dayEvents]): [string, EconomicEventPoint[]] => [date, dayEvents.filter((event) => event.impact === "高")])
      .filter(([, dayEvents]) => dayEvents.length > 0),
    [days],
  );
  const gridClass = "mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3";
  const renderDay = ([date, dayEvents]: [string, EconomicEventPoint[]]) => (
    <div key={date} className="rounded-xl border border-[#e5e2d8] bg-white/60 p-4">
      <div className="mb-3 flex items-baseline justify-between border-b border-[#e5e2d8] pb-2">
        <span className="text-sm font-semibold">{date.replaceAll("-", "/")} {weekdayLabel(date)}</span>
        <span className="text-[11px] text-[#8b908c]">{dayEvents.length} 项</span>
      </div>
      <ul className="space-y-3">
        {dayEvents.map((event, index) => (
          <li key={`${event.date}-${event.timeBeijing}-${index}`} className="flex items-start gap-2.5">
            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${impactStyles[event.impact].className}`}>{event.impact}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#2b332d]">{event.title}</p>
              <p className="mt-0.5 text-[11px] text-[#8b908c]">北京时间 {event.timeBeijing}{event.eventType && ` · ${event.eventType}`}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

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

      {!showAllOnMobile && <div className={`${gridClass} xl:hidden`}>{collapsedDays.map(renderDay)}</div>}
      <div className={`${gridClass} ${showAllOnMobile ? "" : "hidden xl:grid"}`}>{days.map(renderDay)}</div>

      {!showAllOnMobile && impactFilter === "全部" && (
        <div className="mt-5 xl:hidden">
          <button onClick={() => setShowAllOnMobile(true)} className="w-full rounded-lg border border-[#ddd9ce] bg-white/70 py-2 text-xs font-medium text-[#5b6b62] transition hover:bg-white">
            展开全部 {events.length} 项（当前仅显示 {highCount} 项重要事件）
          </button>
        </div>
      )}

      <p className="mt-5 text-[11px] text-[#8b908c]">时间均为北京时间；数据来自东方财富「财经日历」（data.eastmoney.com/cjrl），仅收录国内事件，“高”表示对行情可能有明确指引的关键数据或会议（如 LPR 报价、社融、M2 等），仅供参考，不构成任何投资建议</p>
    </section>
  );
}

