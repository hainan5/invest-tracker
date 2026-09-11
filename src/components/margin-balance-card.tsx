"use client";

import { useMemo, useState } from "react";
import { MiniChart } from "@/components/mini-chart";
import type { MarginBalance } from "@/lib/macro";

const periods = ["1周", "1月", "3月", "1年"] as const;
const periodPoints: Record<(typeof periods)[number], number> = { "1周": 6, "1月": 23, "3月": 66, "1年": 370 };

function formatAmount(value: number) {
  return new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function MarginBalanceCard({ data }: { data: MarginBalance }) {
  const [period, setPeriod] = useState<(typeof periods)[number]>("1月");
  const history = data.history;
  const pointCount = periodPoints[period];
  const window = history.slice(-pointCount);
  const startBalance = window[0]?.marginBalance ?? 0;
  const change = window.length < 2 ? 0 : Math.round(((data.marginBalance - startBalance) / startBalance) * 10000) / 100;
  const increase = change >= 0;

  const stats = useMemo(() => [
    { label: "融资余额", value: `${formatAmount(data.finBalance)} 亿` },
    { label: "融券余额", value: `${formatAmount(data.loanBalance)} 亿` },
    { label: "两融交易额占比", value: `${data.balanceRatio.toFixed(2)}%` },
  ], [data.finBalance, data.loanBalance, data.balanceRatio]);

  return (
    <section id="margin-balance" className="mb-8 overflow-hidden rounded-2xl border border-[#ddd9ce] bg-[#faf9f5] p-6 lg:grid lg:grid-cols-[1fr_0.8fr] lg:gap-10 lg:p-7">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-semibold tracking-[0.16em] text-[#3c6e56]">A-SHARE MARGIN TRADING</p><h2 className="mt-2 text-xl font-semibold">A股融资融券余额</h2></div>
          <span className="rounded-full bg-[#e4ece7] px-3 py-1.5 text-xs text-[#41705a]">{data.date}</span>
        </div>
        <div className="mt-7 flex items-end gap-3">
          <strong className="text-4xl font-semibold tabular-nums text-[#2f5c46]">{formatAmount(data.marginBalance)}</strong>
          <span className="pb-1 text-sm text-[#717873]">亿元 · 两融余额</span>
          <span className={`pb-1 text-sm font-semibold tabular-nums ${increase ? "text-[#357452]" : "text-[#a65042]"}`}>{increase ? "↗" : "↘"} {Math.abs(change)}%</span>
        </div>
        <div className="mt-6 h-20"><MiniChart data={history.map((item) => item.marginBalance)} dates={history.map((item) => item.date)} color={increase ? "#3f8060" : "#a85b4c"} id="margin-balance-history" /></div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-[#8b908c]">数据日期 {data.date} · 交易所每日盘后更新（T-1 日）</p>
          <div className="flex gap-1 rounded-lg bg-[#e6e3da] p-0.5">
            {periods.map((item) => <button key={item} onClick={() => setPeriod(item)} className={`rounded-md px-2 py-0.5 text-[11px] transition ${period === item ? "bg-white text-[#173f2e] shadow-sm" : "text-[#777d79] hover:text-[#173f2e]"}`}>{item}</button>)}
          </div>
        </div>
      </div>
      <div className="mt-7 space-y-5 border-t border-[#e0ddd3] pt-7 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-1">
        {stats.map((item) => (
          <div key={item.label}><div className="mb-2 flex justify-between text-sm"><span>{item.label}</span><span className="font-semibold tabular-nums">{item.value}</span></div></div>
        ))}
        <p className="text-[11px] leading-5 text-[#8b908c]">融资余额上升通常代表杠杆资金入场意愿增强；占比走高说明市场交易活跃度提升。数据来源为交易所披露的汇总统计，仅供趋势参考，不构成任何投资建议。</p>
        <a href="https://data.eastmoney.com/rzrq/total.html" target="_blank" rel="noreferrer" className="inline-flex text-xs font-medium text-[#3c6e56] underline decoration-[#9dc4b2] underline-offset-4">查看两融数据来源（东方财富数据中心）</a>
      </div>
    </section>
  );
}
