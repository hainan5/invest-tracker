#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// 东方财富"财经日历"（data.eastmoney.com/cjrl）真实接口，只保留国内（中国内地/香港）事件。
// 接口时间即北京时间；失败时保留旧数据并以非零码退出。
const apiUrl = "https://datacenter-web.eastmoney.com/api/data/v1/get";
const outputPath = join(process.cwd(), "public", "data", "macro", "economic-events.csv");
const headers = ["date", "time_beijing", "city", "event_type", "impact", "title"];
const maxAgeDays = 10;
const chinaCities = new Set(["中国", "中国香港", "北京市", "上海市", "深圳市", "广州市", "济南市", "大连市", "南宁市", "重庆市", "乌鲁木齐市", "株洲市"]);

// 对行情有明确指引意义的关键国内指标/会议，标记为"高"影响；其余国内事件标记为"中"
const highImpactPatterns = [
  /LPR|贷款市场报价利率/i,
  /社会融资规模/,
  /^中国[:：]?M[012]/,
  /工业增加值/,
  /社会消费品零售/,
  /固定资产投资/,
  /CPI|PPI|GDP/,
  /贸易收支|进出口|贸易顺[差逆]/,
  /外汇储备/,
  /PMI/,
  /议息|货币政策|降准|利率决议/,
  /国务院.*(会议|发布会)/,
  /发改委|央行|财政部.*发布会/,
];

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
    if (!/^\d{2}:\d{2}$/.test(row.time_beijing)) throw new Error(`财经事件 CSV 第 ${index + 2} 行时间格式不正确`);
    if (!row.title) throw new Error(`财经事件 CSV 第 ${index + 2} 行标题为空`);
    if (!["高", "中", "低"].includes(row.impact)) throw new Error(`财经事件 CSV 第 ${index + 2} 行影响等级无效`);
  }
  if (!rows.every((row, index) => index === 0 || `${row.date} ${row.time_beijing}` >= `${rows[index - 1].date} ${rows[index - 1].time_beijing}`)) {
    throw new Error("财经事件 CSV 未按时间升序排列");
  }
  const newest = rows.reduce((latest, row) => row.date > latest ? row.date : latest, "");
  const ageDays = (Date.now() - Date.parse(`${newest}T23:59:59+08:00`)) / 86_400_000;
  if (ageDays > maxAgeDays) throw new Error(`财经事件最新日期过旧: ${newest}`);
}

// 接口时间即北京时间，直接截取 YYYY-MM-DD 与 HH:mm
function splitBeijingTime(raw) {
  const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/.exec(String(raw ?? ""));
  if (!match) throw new Error(`无法解析事件时间: ${JSON.stringify(raw)}`);
  return { date: match[1], time: match[2] };
}

function isChina(entry) {
  const city = String(entry.CITY ?? "").trim();
  const name = String(entry.FE_NAME ?? "");
  return chinaCities.has(city) || /^(中国|全国|国内)/.test(name);
}

function impactFor(entry) {
  const name = String(entry.FE_NAME ?? "");
  const type = String(entry.FE_TYPE ?? "");
  if (/发布会|议息|货币政策|利率决议/.test(name)) return "高";
  if (type === "经济数据") return highImpactPatterns.some((pattern) => pattern.test(name)) ? "高" : "中";
  return "低";
}

async function fetchPage(startDate, endDate, pageNumber) {
  const params = new URLSearchParams({
    reportName: "RPT_CPH_FECALENDAR",
    columns: "START_DATE,END_DATE,FE_CODE,FE_NAME,FE_TYPE,CONTENT,STD_TYPE_CODE,SPONSOR_NAME,CITY",
    source: "WEB",
    client: "WEB",
    filter: `(END_DATE>='${startDate}')(START_DATE<'${endDate}')`,
    sortColumns: "START_DATE",
    sortTypes: "1",
    pageNumber: String(pageNumber),
    pageSize: "500",
  });
  const response = await fetch(`${apiUrl}?${params}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; commodity-tracker/1.0)", Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`财经日历接口 HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload?.success || !Array.isArray(payload?.result?.data)) throw new Error(`财经日历接口返回异常: ${payload?.message ?? "未知错误"}`);
  return payload.result.data;
}

async function update() {
  const nowBeijing = Date.now() + 8 * 3600_000;
  const today = new Date(nowBeijing).toISOString().slice(0, 10);
  const weekLater = new Date(nowBeijing + 7 * 86_400_000).toISOString().slice(0, 10);
  const seen = new Set();
  const rows = [];
  for (let page = 1; page <= 5; page += 1) {
    const entries = await fetchPage(today, weekLater, page);
    for (const entry of entries) {
      const text = `${String(entry.FE_TYPE ?? "")}${String(entry.FE_NAME ?? "")}`;
      if (!isChina(entry) || !entry.FE_NAME || !/经济数据|会议|发布会|讲话/.test(text)) continue;
      const { date, time } = splitBeijingTime(entry.START_DATE);
      const title = String(entry.FE_NAME).trim();
      const key = `${date} ${time} ${title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ date, time_beijing: time, city: String(entry.CITY ?? "").trim(), event_type: String(entry.FE_TYPE ?? "").trim(), impact: impactFor(entry), title });
    }
    if (entries.length < 500) break;
  }
  if (rows.length < 2) throw new Error("国内财经事件数据不足");
  rows.sort((a, b) => `${a.date} ${a.time_beijing}`.localeCompare(`${b.date} ${b.time_beijing}`));
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
  console.log(`已更新 ${rows.length} 条国内财经事件，最新日期 ${rows.reduce((latest, row) => row.date > latest ? row.date : latest, "")}。`);
}

if (process.argv.includes("--check")) {
  validate(parseCsv(await readCsvFile(outputPath)));
  console.log(`已验证 ${parseCsv(await readCsvFile(outputPath)).length} 条财经事件。`);
} else await update();

async function readCsvFile(path) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path, "utf8");
}
