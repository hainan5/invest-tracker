#!/usr/bin/env node
// 五角大楼披萨指数：从 pentagon.pizza（开源情报监测站）抓取其前端调用的
// Supabase Edge Function 快照数据（18 家五角大楼周边披萨店的繁忙度）。
// Supabase anon key 是该站公开内置于前端 JS 的发布密钥，运行时动态提取，不在本仓库保存。
// 失败时保留旧文件并以非零码退出；写入保持原子（临时文件 + 重命名）。
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const siteUrl = "https://pentagon.pizza/";
const outputPath = join(process.cwd(), "public", "data", "macro", "pentagon-pizza.csv");
const locationPath = join(process.cwd(), "public", "data", "macro", "pentagon-pizza-locations.csv");
const historyHeaders = ["snapshot", "avg_busy", "max_busy", "max_deviation", "anomaly_count", "location_count", "late_night"];
const locationHeaders = ["snapshot", "name", "busy", "typical", "deviation", "anomaly"];
const historyMaxDays = 7; // 快照为每次运行时抓取，保留最近 7 天用于走势
const checkMaxAgeHours = 72; // 校验模式：最新快照超过 3 天视为过期
const checkOnly = process.argv.includes("--check");

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.text();
}

function beijingLabel(isoTimestamp) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(isoTimestamp));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}`;
}

function parseCsv(text, expectedHeaders) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (lines[0] !== expectedHeaders.join(",")) throw new Error("披萨指数 CSV 表头不正确");
  return lines.slice(1).filter(Boolean).map((line, index) => {
    const values = line.split(",");
    if (values.length !== expectedHeaders.length) throw new Error(`披萨指数 CSV 第 ${index + 2} 行字段数量不正确`);
    return Object.fromEntries(expectedHeaders.map((header, column) => [header, values[column]]));
  });
}

function historyAgeHours(snapshot) {
  return (Date.now() - Date.parse(snapshot.replace(" ", "T") + "+08:00")) / 3_600_000;
}

function validateHistory(rows) {
  if (rows.length === 0) throw new Error("披萨指数历史数据为空");
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(row.snapshot)) throw new Error(`披萨指数 CSV 第 ${index + 2} 行快照时间格式不正确`);
    if (![row.avg_busy, row.max_busy, row.max_deviation, row.anomaly_count, row.location_count].every((value) => Number.isFinite(Number(value)))) {
      throw new Error(`披萨指数 CSV 第 ${index + 2} 行数值无效`);
    }
    if (!["true", "false"].includes(row.late_night)) throw new Error(`披萨指数 CSV 第 ${index + 2} 行深夜标志无效`);
  }
  if (checkOnly && historyAgeHours(rows.at(-1).snapshot) > checkMaxAgeHours) {
    throw new Error(`披萨指数快照已过期：${rows.at(-1).snapshot}`);
  }
}

function validateLocations(rows) {
  if (rows.length === 0) throw new Error("披萨指数门店数据为空");
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(row.snapshot)) throw new Error(`披萨指数门店 CSV 第 ${index + 2} 行快照时间格式不正确`);
    if (!row.name) throw new Error(`披萨指数门店 CSV 第 ${index + 2} 行门店名为空`);
    if (![row.busy, row.typical, row.deviation].every((value) => Number.isFinite(Number(value)))) {
      throw new Error(`披萨指数门店 CSV 第 ${index + 2} 行数值无效`);
    }
  }
}

function round(value, digits = 1) {
  return Math.round(value * 10 ** digits) / 10 ** digits;
}

async function fetchSnapshot() {
  // 1. 首页 HTML → 前端 JS bundle 路径
  const html = await fetchText(siteUrl);
  const bundle = html.match(/src="(\/assets\/index-[A-Za-z0-9_-]+\.js)"/)?.[1];
  if (!bundle) throw new Error("pentagon.pizza 首页未找到前端 JS 路径");
  // 2. JS bundle 内动态提取公开 Supabase 配置
  const source = await fetchText(new URL(bundle, siteUrl).href);
  const supabaseUrl = source.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0];
  const anonKey = source.match(/eyJhbGciOi[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];
  if (!supabaseUrl || !anonKey) throw new Error("pentagon.pizza 前端未找到 Supabase 公开配置");
  // 3. 调用其 Edge Function 获取最新繁忙度快照
  const response = await fetch(`${supabaseUrl}/functions/v1/fetch-busyness`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) throw new Error(`fetch-busyness HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.success !== true || !Array.isArray(payload.readings) || payload.readings.length < 5) {
    throw new Error("fetch-busyness 返回数据不完整");
  }
  const snapshot = beijingLabel(payload.timestamp);
  const readings = payload.readings.map((reading) => {
    const busy = Number(reading.busyness_level);
    const typical = Number(reading.typical_level);
    const deviation = Number(reading.deviation);
    if (![busy, typical, deviation].every(Number.isFinite) || !reading.location?.name) {
      throw new Error("fetch-busyness 存在无效读数");
    }
    return { snapshot, name: String(reading.location.name), busy, typical, deviation, anomaly: reading.is_anomaly === true };
  });
  return { snapshot, readings, lateNight: payload.isLateNight === true };
}

async function update() {
  const { snapshot, readings, lateNight } = await fetchSnapshot();
  const summary = {
    snapshot,
    avg_busy: round(readings.reduce((sum, item) => sum + item.busy, 0) / readings.length),
    max_busy: round(Math.max(...readings.map((item) => item.busy))),
    max_deviation: round(Math.max(...readings.map((item) => item.deviation)), 2),
    anomaly_count: readings.filter((item) => item.anomaly).length,
    location_count: readings.length,
    late_night: lateNight ? "true" : "false",
  };
  // 历史按快照时间合并去重，只保留最近 7 天
  const merged = new Map(
    (existsSync(outputPath) ? parseCsv(readFileSync(outputPath, "utf8"), historyHeaders) : []).map((row) => [row.snapshot, row]),
  );
  merged.set(snapshot, summary);
  const rows = [...merged.values()]
    .filter((row) => historyAgeHours(row.snapshot) <= historyMaxDays * 24)
    .sort((a, b) => a.snapshot.localeCompare(b.snapshot));
  validateHistory(rows);

  const historyContent = `${historyHeaders.join(",")}\n${rows.map((row) => historyHeaders.map((header) => row[header]).join(",")).join("\n")}\n`;
  const locationRows = readings.slice().sort((a, b) => b.busy - a.busy);
  const locationContent = `${locationHeaders.join(",")}\n${locationRows.map((row) => locationHeaders.map((header) => row[header]).join(",")).join("\n")}\n`;
  mkdirSync(join(outputPath, ".."), { recursive: true });
  if (historyContent !== (existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "")) {
    writeFileSync(`${outputPath}.tmp`, historyContent, "utf8");
    renameSync(`${outputPath}.tmp`, outputPath);
  }
  if (locationContent !== (existsSync(locationPath) ? readFileSync(locationPath, "utf8") : "")) {
    writeFileSync(`${locationPath}.tmp`, locationContent, "utf8");
    renameSync(`${locationPath}.tmp`, locationPath);
  }
  console.log(`已更新披萨指数快照 ${snapshot}：平均繁忙度 ${summary.avg_busy}，异常店铺 ${summary.anomaly_count} 家（历史 ${rows.length} 条快照）。`);
}

if (checkOnly) {
  const history = parseCsv(readFileSync(outputPath, "utf8"), historyHeaders);
  validateHistory(history);
  const locations = parseCsv(readFileSync(locationPath, "utf8"), locationHeaders);
  validateLocations(locations);
  console.log(`已验证 ${history.length} 条披萨指数快照与 ${locations.length} 家门店读数。`);
} else await update();
