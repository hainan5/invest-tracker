"use client";

import { useMemo, useState } from "react";
import { categoryInfos, formatPrice, type Commodity, type CommodityCategory } from "@/lib/commodities";
import { MiniChart } from "@/components/mini-chart";
import { FedRateCard } from "@/components/fed-rate-card";
import { BellIcon, ChartIcon, GridIcon, MenuIcon, SearchIcon, StarIcon } from "@/components/icons";
import type { FedRateProbability } from "@/lib/macro";

const periods = ["1日", "1周", "1月", "3月", "1年"];
const periodPoints: Record<string, number> = { "1日": 2, "1周": 6, "1月": 23, "3月": 66, "1年": 370 };
const categories: Array<"全部" | CommodityCategory> = ["全部", ...categoryInfos.map((item) => item.name)];

export function Dashboard({ commodities, fedRate }: { commodities: Commodity[]; fedRate: FedRateProbability }) {
  const [selectedId, setSelectedId] = useState("crude-oil");
  const [period, setPeriod] = useState("1月");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"全部" | CommodityCategory>("全部");
  const [favorites, setFavorites] = useState(["gold", "crude-oil"]);
  const selected = commodities.find((item) => item.id === selectedId) ?? commodities[0];
  const selectedHistory = selected.history.slice(-periodPoints[period]);
  const latestUpdate = commodities.reduce((latest, item) => item.updatedAt > latest ? item.updatedAt : latest, "");
  const filtered = useMemo(() => commodities.filter((item) => {
    const matchesCategory = category === "全部" || item.category === category;
    const matchesQuery = `${item.name}${item.symbol}${item.subtitle}`.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  }), [category, commodities, query]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <div className="min-h-screen bg-[#f3f1ea] text-[#17231d]">
      <header className="border-b border-[#d9d6ca] bg-[#f8f7f2]/90 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-[1480px] items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-10">
            <a href="#" className="flex items-center gap-3" aria-label="矿脉首页">
              <span className="grid size-9 place-items-center rounded-full bg-[#173f2e] text-lg font-semibold text-[#d8b56a]">矿</span>
              <span className="text-xl font-semibold tracking-[0.16em]">矿脉</span>
            </a>
            <nav className="hidden items-center gap-7 text-sm md:flex">
              <a href="#market" className="font-semibold text-[#173f2e]">市场</a>
              <a href="#watchlist" className="text-[#6c736e] transition hover:text-[#173f2e]">自选</a>
              <a href="#insight" className="text-[#6c736e] transition hover:text-[#173f2e]">洞察</a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-3 hidden items-center gap-2 text-xs text-[#7a807b] sm:flex"><i className="size-2 rounded-full bg-[#4c8b68]" />真实日线已载入</span>
            <button className="grid size-10 place-items-center rounded-full border border-[#d9d6ca] bg-white text-[#45534b]" aria-label="通知"><BellIcon className="size-4" /></button>
            <button className="grid size-10 place-items-center rounded-full bg-[#173f2e] text-sm font-semibold text-white" aria-label="用户中心">投</button>
            <button className="ml-1 grid size-10 place-items-center md:hidden" aria-label="菜单"><MenuIcon /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-5 py-8 lg:px-8 lg:py-12">
        <section className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#9a7229]">COMMODITY PULSE</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">大宗商品，一目了然</h1>
            <p className="mt-3 text-sm text-[#707771]">聚合关键价格与市场脉搏，帮助你更快做出判断。</p>
          </div>
          <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-[#d9d6ca] bg-white px-4 py-3 shadow-[0_8px_30px_rgba(28,45,36,0.04)]">
            <SearchIcon className="size-4 shrink-0 text-[#7f8882]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`搜索 ${commodities.length} 个商品或代码`} className="w-full bg-transparent text-sm outline-none placeholder:text-[#9a9f9b]" />
            <kbd className="rounded border border-[#ddd9ce] bg-[#f5f3ed] px-1.5 py-0.5 text-[10px] text-[#8a8e8b]">⌘ K</kbd>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          {categoryInfos.map((info) => (
            <button key={info.name} onClick={() => setCategory(info.name)} className={`rounded-2xl border bg-[#faf9f5] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(34,48,40,0.07)] ${category === info.name ? "border-[#315b47] ring-1 ring-[#315b47]" : "border-[#ddd9ce]"}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{info.name}</span>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: info.accent, backgroundColor: `${info.accent}14` }}>{commodities.filter((item) => item.category === info.name).length} 个品种</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#747b76]">{info.description}</p>
              <p className="mt-3 text-[11px]" style={{ color: info.accent }}>{info.examples}</p>
            </button>
          ))}
        </section>

        <FedRateCard data={fedRate} />

        <section id="market" className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.7fr)]">
          <div className="min-w-0">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex gap-1 rounded-lg bg-[#e6e3da] p-1">
                {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-md px-3 py-2 text-xs font-medium transition sm:px-4 ${category === item ? "bg-white text-[#173f2e] shadow-sm" : "text-[#777d79] hover:text-[#173f2e]"}`}>{item}</button>)}
              </div>
              <span className="hidden text-xs text-[#8a8f8b] sm:inline">显示 {filtered.length} / {commodities.length}</span>
            </div>

            <div id="watchlist" className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((item, index) => {
                const positive = item.change >= 0;
                const active = selected.id === item.id;
                return (
                  <article key={item.id} onClick={() => setSelectedId(item.id)} className={`animate-rise group cursor-pointer rounded-2xl border bg-[#faf9f5] p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(34,48,40,0.08)] ${active ? "border-[#315b47] ring-1 ring-[#315b47]" : "border-[#ddd9ce]"}`} style={{ animationDelay: `${index * 80}ms` }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-xl text-sm font-bold" style={{ backgroundColor: `${item.color}18`, color: item.color }}>{item.symbol}</span>
                        <div><h2 className="font-semibold">{item.name}</h2><p className="mt-0.5 text-[11px] text-[#858b87]">{item.subtitle}</p></div>
                      </div>
                      <button onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id); }} className="p-1 text-[#b2a374] transition hover:text-[#9a7229]" aria-label={`关注${item.name}`}><StarIcon className="size-4" filled={favorites.includes(item.id)} /></button>
                    </div>
                    <div className="mt-7 flex items-end justify-between gap-4">
                      <div><p className="text-2xl font-semibold tracking-tight tabular-nums">{formatPrice(item.price)}</p><p className="mt-1 text-[11px] text-[#858b87]">{item.unit}</p></div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${positive ? "bg-[#e0eee5] text-[#357452]" : "bg-[#f4e2de] text-[#a65042]"}`}>{positive ? "+" : ""}{item.change}%</span>
                    </div>
                    <div className="mt-5 h-14"><MiniChart data={item.history.slice(-30)} color={positive ? "#3f8060" : "#a85b4c"} id={item.id} /></div>
                  </article>
                );
              })}
              {filtered.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-[#cecabe] py-16 text-center text-sm text-[#808681]">没有找到相关商品</div>}
            </div>

          </div>

          <aside className="h-fit rounded-2xl bg-[#173f2e] p-6 text-white shadow-[0_16px_40px_rgba(23,63,46,0.16)] lg:p-7 xl:sticky xl:top-6">
            <div className="flex items-start justify-between">
              <div><p className="text-xs tracking-[0.15em] text-[#9db6aa]">{selected.symbol} · {selected.category} · {selected.updatedAt}</p><h2 className="mt-2 text-2xl font-semibold">{selected.name}趋势</h2></div>
              <button onClick={() => toggleFavorite(selected.id)} className="grid size-9 place-items-center rounded-full bg-white/10 text-[#dabb75]" aria-label="切换关注"><StarIcon className="size-4" filled={favorites.includes(selected.id)} /></button>
            </div>
            <div className="mt-7 flex items-end justify-between">
              <div><p className="text-3xl font-semibold tabular-nums">{formatPrice(selected.price)}</p><p className="mt-1 text-xs text-[#9db6aa]">{selected.unit}</p></div>
              <p className={`text-sm font-semibold ${selected.change >= 0 ? "text-[#86c49f]" : "text-[#e99b8d]"}`}>{selected.change >= 0 ? "↗" : "↘"} {Math.abs(selected.change)}%</p>
            </div>
            <div className="mt-8 h-56"><MiniChart data={selectedHistory} color={selected.change >= 0 ? "#83c09c" : "#e18d7f"} id={`detail-${selected.id}`} detailed /></div>
            <div className="mt-5 flex justify-between border-b border-white/15 pb-5">
              {periods.map((item) => <button key={item} onClick={() => setPeriod(item)} className={`rounded-md px-2.5 py-1.5 text-xs transition ${period === item ? "bg-white text-[#173f2e]" : "text-[#9db6aa] hover:text-white"}`}>{item}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 py-6">
              <Detail label="今开" value={formatPrice(selected.open)} /><Detail label="最高" value={formatPrice(selected.high)} />
              <Detail label="最低" value={formatPrice(selected.low)} /><Detail label="成交量" value={selected.volume} />
            </div>
            <div id="insight" className="rounded-xl bg-white/8 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#dabb75]"><ChartIcon className="size-4" />市场观察</div>
              <p className="text-xs leading-5 text-[#c6d3cd]">{selected.insight}</p>
            </div>
          </aside>
        </section>

        <section className="mt-8 rounded-2xl border border-[#ddd9ce] bg-[#faf9f5] p-5 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><span className="grid size-10 place-items-center rounded-full bg-[#eee9dc] text-[#9a7229]"><GridIcon className="size-4" /></span><div><h3 className="text-sm font-semibold">每品种独立 CSV</h3><p className="mt-1 text-xs text-[#858b87]">已加载 {commodities.length} 个品种最近一年的真实日线</p></div></div>
          <code className="mt-4 block rounded-lg bg-[#eeeae0] px-3 py-2 text-[11px] text-[#536159] sm:mt-0">public/data/commodities/*.csv</code>
        </section>
        <p className="mt-5 text-center text-[11px] text-[#939893]">日线来源：新浪财经公开行情 · 更新至 {latestUpdate.replaceAll("-", "/")} · 不构成任何投资建议</p>
      </main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] text-[#8faaa0]">{label}</p><p className="mt-1 text-sm font-medium tabular-nums">{value}</p></div>;
}