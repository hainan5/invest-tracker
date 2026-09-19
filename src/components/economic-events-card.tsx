"use client";

import { useMemo, useState } from "react";
import type { EconomicEventPoint } from "@/lib/macro";

const impactStyles: Record<EconomicEventPoint["impact"], { label: string; className: string }> = {
  High: { label: "高", className: "bg-[#f4e2de] text-[#a65042]" },
  Medium: { label: "中", className: "bg-[#f2ecdb] text-[#8a6a2a]" },
  Low: { label: "低", className: "bg-[#e8e5dc] text-[#6d746f]" },
  Holiday: { label: "休市", className: "bg-[#e4ece7] text-[#41705a]" },
  "Non-Economic": { label: "其他", className: "bg-[#e8e5dc] text-[#6d746f]" },
};

const currencyLabels: Record<string, string> = {
  USD: "美元", CNY: "人民币", EUR: "欧元", JPY: "日元", GBP: "英镑",
  AUD: "澳元", CAD: "加元", CHF: "瑞郎", NZD: "纽元", All: "全球",
};

// 上游标题为英文，这里翻译成中文；未命中整句时按通用规则转换周期后缀，仍不识别则保留原文
const titleTranslations: Record<string, string> = {
  // 美国 / 美联储
  "FOMC Statement": "FOMC 政策声明",
  "FOMC Press Conference": "FOMC 新闻发布会",
  "FOMC Economic Projections": "FOMC 经济预测（点阵图）",
  "FOMC Member Bowman Speaks": "FOMC 委员鲍曼讲话",
  "FOMC Member Schmid Speaks": "FOMC 委员施密德讲话",
  "Federal Funds Rate": "联邦基金利率",
  "Treasury Sec Bessent Speaks": "美国财长贝森特讲话",
  "ADP Weekly Employment Change": "ADP 周度就业人数变化",
  "ADP Employment Change": "ADP 就业人数变化",
  "Nonfarm Payrolls": "非农就业人数", "Non-Farm Payrolls": "非农就业人数", "NFP": "非农就业人数",
  "Unemployment Claims": "初请失业金人数",
  "Unemployment Rate": "失业率",
  "Average Hourly Earnings m/m": "平均时薪（环比）",
  "CPI m/m": "CPI（环比）", "CPI y/y": "CPI（同比）",
  "Core CPI m/m": "核心CPI（环比）", "Core CPI y/y": "核心CPI（同比）",
  "Median CPI y/y": "中位数CPI（同比）", "Trimmed CPI y/y": "截尾均值CPI（同比）",
  "Final CPI y/y": "CPI 终值（同比）", "Final Core CPI y/y": "核心CPI 终值（同比）",
  "PPI m/m": "PPI（环比）", "Core PPI m/m": "核心PPI（环比）",
  "PPI Input m/m": "PPI 投入价格（环比）", "PPI Output m/m": "PPI 产出价格（环比）",
  "Import Prices m/m": "进口物价（环比）", "Export Prices m/m": "出口物价（环比）",
  "Retail Sales m/m": "零售销售（环比）", "Retail Sales y/y": "零售销售（同比）",
  "Core Retail Sales m/m": "核心零售销售（环比）",
  "Industrial Production m/m": "工业产出（环比）", "Industrial Production y/y": "工业产出（同比）",
  "Revised Industrial Production m/m": "工业产出修正值（环比）",
  "Manufacturing Sales m/m": "制造业销售（环比）",
  "Capacity Utilization Rate": "产能利用率",
  "Housing Starts": "新屋开工", "Building Permits": "建筑许可", "Building Permits m/m": "建筑许可（环比）",
  "Pending Home Sales m/m": "成屋签约销售（环比）",
  "New Home Prices m/m": "新房价格（环比）", "NHPI m/m": "新屋价格指数（环比）",
  "HPI y/y": "房价指数（同比）",
  "NAHB Housing Market Index": "NAHB 住房市场指数",
  "Empire State Manufacturing Index": "纽约联储制造业指数",
  "Philly Fed Manufacturing Index": "费城联储制造业指数",
  "CB Leading Index m/m": "领先指标（环比）",
  "Business Inventories m/m": "商业库存（环比）", "Wholesale Sales m/m": "批发销售（环比）",
  "Crude Oil Inventories": "原油库存", "Natural Gas Storage": "天然气库存",
  "API Weekly Statistical Bulletin": "API 原油周报",
  "Trade Balance": "贸易收支", "Current Account": "经常账户",
  "TIC Long-Term Purchases": "外资长期净流入", "Foreign Securities Purchases": "外资证券购买净额",
  "FPI m/m": "外资证券投资（环比）",
  // 欧洲
  "ECB President Lagarde Speaks": "欧洲央行行长拉加德讲话",
  "German Buba President Nagel Speaks": "德国央行行长纳格尔讲话",
  "German ZEW Economic Sentiment": "德国ZEW 经济景气指数", "ZEW Economic Sentiment": "ZEW 经济景气指数",
  "German PPI m/m": "德国PPI（环比）", "German WPI m/m": "德国批发物价指数（环比）",
  "French Final CPI m/m": "法国CPI 终值（环比）",
  "German 30-y Bond Auction": "德国30年期国债拍卖", "Spanish 10-y Bond Auction": "西班牙10年期国债拍卖",
  "ECOFIN Meetings": "欧盟经济与财政部长会议", "Eurogroup Meetings": "欧元集团会议",
  "GDP q/q": "GDP（季环比）",
  // 中国
  "NBS Press Conference": "国家统计局新闻发布会",
  "Fixed Asset Investment ytd/y": "固定资产投资（年内累计）",
  "Industrial Production y/y CN": "工业产出（同比）",
  "Retail Sales y/y CN": "零售销售（同比）",
  "Foreign Direct Investment ytd/y": "外商直接投资（年内累计）",
  "New Loans": "新增贷款", "M2 Money Supply y/y": "M2 货币供应（同比）",
  "New Home Prices m/m CN": "新房价格（环比）",
  // 日澳加等其他地区
  "BOJ Policy Rate": "日本央行政策利率", "BOJ Press Conference": "日本央行新闻发布会",
  "National Core CPI y/y": "全国核心CPI（同比）", "Common CPI y/y": "共性CPI（同比）",
  "Core Machinery Orders m/m": "核心机械订单（环比）",
  "Tertiary Industry Activity m/m": "第三产业活动指数（环比）",
  "Visitor Arrivals m/m": "入境游客（环比）",
  "RBA Gov Bullock Speaks": "澳洲联储行长布洛克讲话", "RBA Assist Gov Hunter Speaks": "澳洲联储助理行长亨特讲话",
  "Westpac Consumer Sentiment": "西太平洋银行消费者信心",
  "MI Leading Index m/m": "MI 领先指标（环比）",
  "BusinessNZ Services Index": "新西兰服务业表现指数",
  "BOC Summary of Deliberations": "加拿大央行会议纪要",
  "MPC Official Bank Rate Votes": "英国央行利率决议投票", "Official Bank Rate": "央行基准利率",
  "Claimant Count Change": "领取失业金人数变化",
  "Average Earnings Index 3m/y": "平均工资指数（三个月同比）",
  "RMPI m/m": "原材料价格指数（环比）", "IPPI m/m": "工业生产者价格指数（环比）",
  "New Home Prices m/m CA": "新房价格（环比）",
  "Monetary Policy Statement": "货币政策声明", "Monetary Policy Summary": "货币政策摘要",
  "SECO Economic Forecasts": "瑞士联邦经济总局经济预测",
  "GDT Price Index": "全球乳制品拍卖价格指数",
};

function translateTitle(raw: string) {
  const key = raw.trim();
  const exact = titleTranslations[key];
  if (exact) return exact;
  return key
    .replace(/\b3m\/y\b/g, "三个月同比")
    .replace(/\bytd\/y\b/g, "年内累计")
    .replace(/\bm\/m\b/g, "环比")
    .replace(/\by\/y\b/g, "同比")
    .replace(/\bq\/q\b/g, "季环比")
    .replace(/\bw\/w\b/g, "周环比")
    .replace(/\bPress Conference\b/g, "新闻发布会")
    .replace(/\bBond Auction\b/g, "国债拍卖")
    .replace(/\bSpeaks\b/g, "讲话");
}

// 上游数值使用 K/M/B/T 等英文缩写，换算成中文习惯单位（55K=5.5万，480B=4800亿）
function formatValue(raw: string) {
  const match = /^(-?\d+(?:\.\d+)?)\s*([KMBT])$/.exec(raw.trim());
  if (!match) return raw;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return raw;
  switch (match[2]) {
    case "K": return `${value / 10}万`;
    case "M": return `${value * 100}万`;
    case "B": return `${value * 10}亿`;
    case "T": return `${value}万亿`;
    default: return raw;
  }
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function formatBeijingTime(date: string, timeUtc: string) {
  const parsed = new Date(`${date}T${timeUtc}:00Z`);
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Shanghai" }).format(parsed);
}

export function EconomicEventsCard({ events }: { events: EconomicEventPoint[] }) {
  const [impactFilter, setImpactFilter] = useState<"全部" | "High" | "Medium">("全部");

  const days = useMemo(() => {
    const filtered = events.filter((event) => {
      if (impactFilter === "全部") return true;
      return impactFilter === "High" ? event.impact === "High" : event.impact === "High" || event.impact === "Medium";
    });
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

  const highCount = events.filter((event) => event.impact === "High").length;

  return (
    <section id="economic-events" className="mb-8 overflow-hidden rounded-2xl border border-[#ddd9ce] bg-[#faf9f5] p-6 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#5b5a4a]">KEY EVENTS THIS WEEK</p>
          <h2 className="mt-2 text-xl font-semibold">本周重要事件一览</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#eee9dc] px-3 py-1.5 text-xs text-[#735c2f]">{highCount} 项高影响</span>
          <div className="flex gap-1 rounded-lg bg-[#e6e3da] p-1">
            {(["全部", "High", "Medium"] as const).map((item) => (
              <button key={item} onClick={() => setImpactFilter(item)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${impactFilter === item ? "bg-white text-[#173f2e] shadow-sm" : "text-[#777d79] hover:text-[#173f2e]"}`}>
                {item === "全部" ? "全部" : item === "High" ? "重要" : "中等"}
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
                  <li key={`${event.date}-${event.timeUtc}-${index}`} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${impact.className}`}>{impact.label}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-[#2b332d]" title={`${event.title} (${translateTitle(event.title)})`}>{translateTitle(event.title)}</p>
                      <p className="mt-0.5 text-[11px] text-[#8b908c]">
                        {event.currency in currencyLabels ? currencyLabels[event.currency] : event.currency} · 北京时间 {formatBeijingTime(event.date, event.timeUtc)}
                        {(event.forecast || event.previous) && ` · 预期 ${formatValue(event.forecast) || "--"} / 前值 ${formatValue(event.previous) || "--"}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[11px] text-[#8b908c]">时间已换算为北京时间，标题与数值已翻译为中文（原始数据来自国际财经日历 ForexFactory，未翻译的标题保留英文），仅供参考，不构成任何投资建议</p>
    </section>
  );
}
