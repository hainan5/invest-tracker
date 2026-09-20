"use client";

import { useMemo, useState } from "react";
import type { EconomicEventPoint, MorningBriefPoint } from "@/lib/macro";

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

// 上游条目常带原始序号（"1、"）或圈码，展示时去掉，避免与分组标题重复
function stripBullet(text: string) {
  return text.replace(/^\d+、\s*/, "").replace(/^[①-⑩]\s*/, "").trim();
}

export function EconomicEventsCard({ events, morningBrief }: { events: EconomicEventPoint[]; morningBrief?: MorningBriefPoint[] }) {
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

  // 昨日今晨：按日期从新到旧分组，"关注"（今日☆事件）单独提到每组最前
  const briefDays = useMemo(() => {
    if (!morningBrief?.length) return [];
    const grouped = new Map<string, { briefs: MorningBriefPoint[]; upcoming: MorningBriefPoint[] }>();
    for (const brief of morningBrief) {
      const group = grouped.get(brief.date) ?? { briefs: [], upcoming: [] };
      if (brief.section === "关注") group.upcoming.push(brief);
      else group.briefs.push(brief);
      grouped.set(brief.date, group);
    }
    return [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [morningBrief]);

  return (
    <section id="economic-events" className="mb-8 overflow-hidden rounded-2xl border border-[#ddd9ce] bg-[#faf9f5] p-6 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#5b5a4a]">A-SHARE CALENDAR & BRIEFING</p>
          <h2 className="mt-2 text-xl font-semibold">A股日历与昨日今晨</h2>
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

      {briefDays.length > 0 && (
        <div className="mt-8 border-t border-[#e5e2d8] pt-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-semibold">昨日今晨</span>
            <span className="rounded-full bg-[#eee9dc] px-2.5 py-1 text-[11px] text-[#735c2f]">最近 {briefDays.length} 天 · 金十数据</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {briefDays.map(([date, group]) => (
              <div key={date} className="rounded-xl border border-[#e5e2d8] bg-white/60 p-4">
                <div className="mb-3 flex items-baseline justify-between border-b border-[#e5e2d8] pb-2">
                  <span className="text-sm font-semibold">{date.replaceAll("-", "/")} {weekdayLabel(date)}</span>
                  <span className="text-[11px] text-[#8b908c]">{group.briefs.length} 条要闻</span>
                </div>
                {group.upcoming.length > 0 && (
                  <div className="mb-3 rounded-lg bg-[#f0ede2] p-2.5">
                    <p className="mb-1.5 text-[11px] font-semibold text-[#9a7229]">今日关注</p>
                    <ul className="space-y-1">
                      {group.upcoming.map((brief, index) => (
                        <li key={`up-${index}`} className="text-[11px] leading-5 text-[#5b5442]">{stripBullet(brief.content)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <ul className="space-y-2">
                  {group.briefs.map((brief, index) => (
                    <li key={`brief-${index}`} className="flex gap-2 text-xs leading-5 text-[#2b332d]"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#b6b0a0]" /><span>{stripBullet(brief.content)}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-[11px] text-[#8b908c]">A股日历来自东方财富数据中心（限售解禁与分红按规模取前 10）；「昨日今晨」来自金十数据全球财经早餐，仅供参考，不构成任何投资建议</p>
    </section>
  );
}
