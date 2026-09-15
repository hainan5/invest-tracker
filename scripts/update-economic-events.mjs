#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ForexFactory 本周财经日历（免费 JSON 端点 nfs.faireconomy.media）。
// 接口有频率限制，只做单次请求；失败时保留旧数据并以非零码退出。
const apiUrl = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const outputPath = join(process.cwd(), "public", "data", "macro", "economic-events.csv");
const headers = ["date", "time_utc", "currency", "impact", "title", "forecast", "previous"];
const maxAgeDays = 10;

function csvField(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsvLine(line) {
  const fields = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      fields.push(value.trim());
      value = "";
    } else value += character;
  }
  fields.push(value.trim());
  return fields;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (parseCsvLine(lines[0]).join(",") !== headers.join(",")) throw new Error("财经事件 CSV 表头不正确");
  return lines.slice(1).filter(Boolean).map((line, index) => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) throw new Error(`财经事件 CSV 第 ${index + 2} 行字段数量不正确`);
    return Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex]]));
  });
}

function validate(rows) {
  if (rows.length < 2) throw new Error("财经事件数据不足");
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error(`财经事件 CSV 第 ${index + 2} 行日期格式不正确`);
    if (!/^\d{2}:\d{2}$/.test(row.time_utc)) throw new Error(`财经事件 CSV 第 ${index + 2} 行时间格式不正确`);
    if (!/^[A-Z]{2,3}$/.test(row.currency)) throw new Error(`财经事件 CSV 第 ${index + 2} 行货币代码无效`);
    if (!["High", "Medium", "Low", "Holiday", "Non-Economic"].includes(row.impact)) throw new Error(`财经事件 CSV 第 ${index + 2} 行影响等级无效`);
    if (!row.title) throw new Error(`财经事件 CSV 第 ${index + 2} 行标题为空`);
  }
  if (!rows.every((row, index) => index === 0 || `${row.date} ${row.time_utc}` >= `${rows[index - 1].date} ${rows[index - 1].time_utc}`)) {
    throw new Error("财经事件 CSV 未按时间升序排列");
  }
  const newest = rows.reduce((latest, row) => row.date > latest ? row.date : latest, "");
  const ageDays = (Date.now() - Date.parse(`${newest}T23:59:59Z`)) / 86_400_000;
  if (ageDays > maxAgeDays) throw new Error(`财经事件最新日期过旧: ${newest}`);
}

function utcTime(entry) {
  // 上游时间为 ISO 偏移（如 2026-09-15T08:30:00-04:00），统一换算成 UTC 展示
  const parsed = new Date(entry.date);
  if (Number.isNaN(parsed.getTime())) throw new Error(`无法解析事件时间: ${JSON.stringify(entry)}`);
  return parsed.toISOString().slice(11, 16);
}

async function update() {
  const response = await fetch(apiUrl, {
    headers: { "User-Agent": "commodity-tracker/1.0", Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`财经日历接口 HTTP ${response.status}`);
  const entries = await response.json();
  if (!Array.isArray(entries) || entries.length === 0) throw new Error("财经日历接口返回为空");
  const rows = entries
    .filter((entry) => typeof entry?.title === "string" && entry.title)
    .map((entry) => ({
      date: String(entry.date).slice(0, 10),
      time_utc: utcTime(entry),
      currency: String(entry.country ?? "").trim(),
      impact: String(entry.impact ?? "").trim(),
      title: entry.title.trim(),
      forecast: String(entry.forecast ?? "").trim(),
      previous: String(entry.previous ?? "").trim(),
    }))
    .filter((row) => validateRowShape(row))
    .sort((a, b) => `${a.date} ${a.time_utc}`.localeCompare(`${b.date} ${b.time_utc}`));
  validate(rows);
  const content = `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvField(row[header])).join(",")).join("\n")}\n`;
  const previousContent = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";
  if (content === previousContent) {
    console.log(`财经事件无新数据，共 ${rows.length} 条。`);
    return;
  }
  mkdirSync(join(outputPath, ".."), { recursive: true });
  writeFileSync(`${outputPath}.tmp`, content, "utf8");
  renameSync(`${outputPath}.tmp`, outputPath);
  console.log(`已更新 ${rows.length} 条财经事件，最新日期 ${rows.reduce((latest, row) => row.date > latest ? row.date : latest, "")}。`);
}

function validateRowShape(row) {
  return /^\d{4}-\d{2}-\d{2}$/.test(row.date)
    && /^\d{2}:\d{2}$/.test(row.time_utc)
    && /^[A-Z]{2,3}$/.test(row.currency)
    && ["High", "Medium", "Low", "Holiday", "Non-Economic"].includes(row.impact);
}

if (process.argv.includes("--check")) {
  validate(parseCsv(await readCsvFile(outputPath)));
  console.log(`已验证 ${parseCsv(await readCsvFile(outputPath)).length} 条财经事件。`);
} else await update();

async function readCsvFile(path) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path, "utf8");
}
