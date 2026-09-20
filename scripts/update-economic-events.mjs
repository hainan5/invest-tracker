#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// A 股日历：聚合东方财富数据中心四个真实报表，只保留对 A 股行情有参考价值的国内事件。
// 各接口失败时保留旧数据并以非零码退出；写入保持原子（临时文件 + 重命名）。
const apiBase = "https://datacenter-web.eastmoney.com/api/data/v1/get";
// 金十早餐专题列表页与详情页（"昨日今晨重要新闻汇总"），公开页面无需鉴权
const jin10TopicUrl = "https://xnews.jin10.com/topic/343";
const outputPath = join(process.cwd(), "public", "data", "macro", "economic-events.csv");
const newsPath = join(process.cwd(), "public", "data", "macro", "morning-brief.csv");
const headers = ["date", "category", "title", "detail"];
const newsHeaders = ["date", "section", "content"];
const newsMaxDays = 3;
const maxAgeDays = 15; // 放宽以容忍春节/国庆等长假期窗口内无新事件
// 对 A 股有明确指引意义的国内宏观指标
const macroKeepPatterns = [
  /LPR|贷款市场报价利率/i, /社会融资规模/, /^中国[:：]?M[012]/, /工业增加值/, /社会消费品零售/,
  /固定资产投资/, /中国[:：]?.*CPI|中国[:：]?.*PPI/, /贸易收支|进出口|贸易顺[差逆]/, /外汇储备/, /PMI/,
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
  if (parseCsvLine(lines[0]).join(",") !== headers.join(",")) throw new Error("A股日历 CSV 表头不正确");
  return lines.slice(1).filter(Boolean).map((line, index) => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) throw new Error(`A股日历 CSV 第 ${index + 2} 行字段数量不正确`);
    return Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex]]));
  });
}

function validate(rows) {
  if (rows.length === 0) throw new Error("A股日历数据为空");
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error(`A股日历 CSV 第 ${index + 2} 行日期格式不正确`);
    if (!["新股申购", "限售解禁", "分红除权", "宏观数据"].includes(row.category)) throw new Error(`A股日历 CSV 第 ${index + 2} 行分类无效`);
    if (!row.title) throw new Error(`A股日历 CSV 第 ${index + 2} 行标题为空`);
  }
  if (!rows.every((row, index) => index === 0 || row.date >= rows[index - 1].date)) throw new Error("A股日历 CSV 未按日期升序排列");
  const newest = rows.reduce((latest, row) => row.date > latest ? row.date : latest, "");
  const ageDays = (Date.now() - Date.parse(`${newest}T23:59:59+08:00`)) / 86_400_000;
  if (ageDays > maxAgeDays) throw new Error(`A股日历最新日期过旧: ${newest}`);
}

async function fetchReport(reportName, params, columns) {
  const query = new URLSearchParams({ reportName, columns, source: "WEB", client: "WEB", ...params });
  const response = await fetch(`${apiBase}?${query}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; commodity-tracker/1.0)", Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${reportName} 接口 HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload?.success || !Array.isArray(payload?.result?.data)) throw new Error(`${reportName} 接口返回异常: ${payload?.message ?? "未知错误"}`);
  return payload.result.data;
}

function ymd(raw) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(raw ?? ""));
  if (!match) throw new Error(`无法解析日期: ${JSON.stringify(raw)}`);
  return match[1];
}

function dateRange() {
  const nowBeijing = Date.now() + 8 * 3600_000;
  // 最近三天：今天至后天（含当天，覆盖盘后披露的次日安排）
  const start = new Date(nowBeijing).toISOString().slice(0, 10);
  const end = new Date(nowBeijing + 2 * 86_400_000).toISOString().slice(0, 10);
  return { start, end };
}

function formatYi(value) {
  // LIFT_MARKET_CAP 单位为万元；转换为亿元（已用中远海特 2026-09-21 解禁公告交叉验证）
  return `${(Number(value) / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}亿`;
}

async function fetchIpo({ start, end }) {
  const rows = await fetchReport("RPTA_APP_IPOAPPLY", {
    filter: `(APPLY_DATE>='${start}')(APPLY_DATE<='${end}')`, sortColumns: "APPLY_DATE", sortTypes: "1", pageNumber: "1", pageSize: "30",
  }, "SECURITY_NAME,APPLY_DATE,ISSUE_PRICE,MARKET_TYPE_NEW");
  return rows.filter((row) => row.APPLY_DATE && row.SECURITY_NAME).map((row) => {
    const price = row.ISSUE_PRICE ? `发行价 ${row.ISSUE_PRICE} 元` : "发行价待定";
    return { date: ymd(row.APPLY_DATE), category: "新股申购", title: `${row.SECURITY_NAME}（${row.MARKET_TYPE_NEW ?? ""}）新股申购`, detail: price };
  });
}

async function fetchLift({ start, end }) {
  const rows = await fetchReport("RPT_LIFT_STAGE", {
    filter: `(FREE_DATE>='${start}')(FREE_DATE<='${end}')`, sortColumns: "LIFT_MARKET_CAP", sortTypes: "-1", pageNumber: "1", pageSize: "10",
  }, "SECURITY_NAME_ABBR,FREE_DATE,FREE_SHARES_TYPE,LIFT_MARKET_CAP");
  const typeLabel = (type) => String(type ?? "").split(",")[0].replace("限售股份", "").replace("上市流通", "").trim() || "限售";
  return rows.filter((row) => row.FREE_DATE && row.SECURITY_NAME_ABBR).map((row) => ({
    date: ymd(row.FREE_DATE), category: "限售解禁",
    title: `${row.SECURITY_NAME_ABBR} 限售解禁`,
    detail: `解禁市值约 ${formatYi(row.LIFT_MARKET_CAP)} · ${typeLabel(row.FREE_SHARES_TYPE)}`,
  }));
}

async function fetchDividend({ start, end }) {
  const rows = await fetchReport("RPT_SHAREBONUS_DET", {
    filter: `(EX_DIVIDEND_DATE>='${start}')(EX_DIVIDEND_DATE<='${end}')`, sortColumns: "PRETAX_BONUS_RMB", sortTypes: "-1", pageNumber: "1", pageSize: "10",
  }, "SECURITY_NAME_ABBR,EX_DIVIDEND_DATE,IMPL_PLAN_PROFILE");
  return rows.filter((row) => row.EX_DIVIDEND_DATE && row.SECURITY_NAME_ABBR).map((row) => ({
    date: ymd(row.EX_DIVIDEND_DATE), category: "分红除权",
    title: `${row.SECURITY_NAME_ABBR} 除权除息`,
    detail: String(row.IMPL_PLAN_PROFILE ?? "").trim() || "分红方案见公告",
  }));
}

async function fetchMacro({ start, end }) {
  const rows = await fetchReport("RPT_CPH_FECALENDAR", {
    filter: `(END_DATE>='${start}')(START_DATE<='${end}')(STD_TYPE_CODE="2")`, sortColumns: "START_DATE", sortTypes: "1", pageNumber: "1", pageSize: "500",
  }, "START_DATE,FE_NAME,FE_TYPE,CITY");
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const name = String(row.FE_NAME ?? "");
    if (row.CITY !== "中国" || !macroKeepPatterns.some((pattern) => pattern.test(name))) continue;
    const date = ymd(row.START_DATE);
    const title = name.replace(/^中国[:：]?/, "").trim().replace(/\(报告期:[^)]*\)/, "").trim();
    const key = `${date} ${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ date, category: "宏观数据", title, detail: "影响流动性与市场利率预期" });
  }
  return result;
}

async function fetchMorningBrief() {
  const listResponse = await fetch(jin10TopicUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; commodity-tracker/1.0)", Accept: "text/html" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!listResponse.ok) throw new Error(`金十早餐列表页 HTTP ${listResponse.status}`);
  const listHtml = await listResponse.text();
  // 列表项结构：data-id 的容器内，标题 p 中含日期（中间隔着缩略图等节点）
  const items = [...listHtml.matchAll(/data-id="(\d+)"[^>]*class="jin10-news-list-item[^"]*"[\s\S]*?class="jin10-news-list-item-title">\s*([^<]+?)\s*<\/p>/g)]
    .map((match) => ({ id: match[1], title: match[2].trim() }))
    .filter((item) => /财经早餐/.test(item.title));
  if (items.length === 0) throw new Error("金十早餐列表页未解析到文章");
  const briefs = [];
  for (const item of items.slice(0, newsMaxDays)) {
    const detailResponse = await fetch(`https://xnews.jin10.com/details/${item.id}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; commodity-tracker/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!detailResponse.ok) throw new Error(`金十早餐详情页 HTTP ${detailResponse.status}`);
    const detailHtml = await detailResponse.text();
    // 日期从标题提取（"金十数据全球财经早餐 | 2026年9月18日"）
    const dateMatch = /(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(item.title);
    if (!dateMatch) throw new Error(`金十早餐标题无日期: ${item.title}`);
    const date = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
    // 正文段落：<p>5~120字</p>，剔除关注事件行（☆ 开头，另行整理）
    const paragraphs = [...detailHtml.matchAll(/<p>([^<]{5,200})<\/p>/g)].map((match) => match[1].trim());
    for (const raw of paragraphs) {
      const text = raw.replace(/^<[^>]+>|<\/[^>]+>$/g, "").trim();
      if (!text || text.length < 8) continue;
      if (/^☆/.test(raw)) briefs.push({ date, section: "关注", content: text.replace(/^☆\s*/, "").trim() });
      else if (/^\d+、/.test(raw) || /^[①-⑩]/.test(raw)) briefs.push({ date, section: "要闻", content: text });
      else if (/[(（]图|来源[:：]/.test(text)) continue;
      else briefs.push({ date, section: "要闻", content: text });
    }
  }
  if (briefs.length === 0) throw new Error("金十早餐正文未解析到条目");
  return briefs;
}

function validateNews(rows) {
  if (rows.length === 0) throw new Error("金十早餐数据为空");
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error(`金十早餐 CSV 第 ${index + 2} 行日期无效`);
    if (!["要闻", "关注"].includes(row.section)) throw new Error(`金十早餐 CSV 第 ${index + 2} 行栏目无效`);
    if (!row.content) throw new Error(`金十早餐 CSV 第 ${index + 2} 行内容为空`);
  }
  const dates = [...new Set(rows.map((row) => row.date))].sort();
  const newest = dates[dates.length - 1];
  const ageDays = (Date.now() - Date.parse(`${newest}T23:59:59+08:00`)) / 86_400_000;
  if (ageDays > newsMaxDays + 2) throw new Error(`金十早餐最新日期过旧: ${newest}`);
}

async function update() {
  const range = dateRange();
  const rows = (await Promise.all([fetchIpo(range), fetchLift(range), fetchDividend(range), fetchMacro(range)])).flat();
  // 长假期窗口内可能没有任何事件；此时保留旧文件而不是覆盖为空
  const hasCalendar = rows.length > 0 || existsSync(outputPath);
  if (!hasCalendar) throw new Error("A股日历数据不足且无历史文件");
  if (rows.length > 0) {
    rows.sort((a, b) => a.date.localeCompare(b.date));
    validate(rows);
    const content = `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvField(row[header])).join(",")).join("\n")}\n`;
    const previousContent = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";
    if (content === previousContent) console.log(`A股日历无新数据，共 ${rows.length} 条。`);
    else {
      mkdirSync(join(outputPath, ".."), { recursive: true });
      writeFileSync(`${outputPath}.tmp`, content, "utf8");
      renameSync(`${outputPath}.tmp`, outputPath);
      console.log(`已更新 ${rows.length} 条A股日历事件，最新日期 ${rows.reduce((latest, row) => row.date > latest ? row.date : latest, "")}。`);
    }
  }

  // 金十早餐"昨日今晨"：独立 CSV，失败时抛错保留旧文件
  const newsRows = await fetchMorningBrief();
  validateNews(newsRows);
  const newsContent = `${newsHeaders.join(",")}\n${newsRows.map((row) => newsHeaders.map((header) => csvField(row[header])).join(",")).join("\n")}\n`;
  const previousNews = existsSync(newsPath) ? readFileSync(newsPath, "utf8") : "";
  if (newsContent === previousNews) console.log(`金十早餐无新数据，共 ${newsRows.length} 条。`);
  else {
    mkdirSync(join(newsPath, ".."), { recursive: true });
    writeFileSync(`${newsPath}.tmp`, newsContent, "utf8");
    renameSync(`${newsPath}.tmp`, newsPath);
    const dates = [...new Set(newsRows.map((row) => row.date))].sort();
    console.log(`已更新 ${newsRows.length} 条金十早餐要闻，覆盖 ${dates[0]} 至 ${dates[dates.length - 1]}。`);
  }
}

if (process.argv.includes("--check")) {
  validate(parseCsv(await readCsvFile(outputPath)));
  console.log(`已验证 ${parseCsv(await readCsvFile(outputPath)).length} 条A股日历事件。`);
  validateNews(parseCsvNews(await readCsvFile(newsPath)));
  console.log(`已验证 ${parseCsvNews(await readCsvFile(newsPath)).length} 条金十早餐要闻。`);
} else await update();

function parseCsvNews(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (parseCsvLine(lines[0]).join(",") !== newsHeaders.join(",")) throw new Error("金十早餐 CSV 表头不正确");
  return lines.slice(1).filter(Boolean).map((line, index) => {
    const values = parseCsvLine(line);
    if (values.length !== newsHeaders.length) throw new Error(`金十早餐 CSV 第 ${index + 2} 行字段数量不正确`);
    return Object.fromEntries(newsHeaders.map((header, columnIndex) => [header, values[columnIndex]]));
  });
}

async function readCsvFile(path) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path, "utf8");
}
