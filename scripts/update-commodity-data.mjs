import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const catalogPath = join(root, "public", "data", "commodities.csv");
const outputDirectory = join(root, "public", "data", "commodities");
const headers = ["date", "open", "high", "low", "close", "volume"];
const checkOnly = process.argv.includes("--check");

function parseLine(line) {
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

function readCsv(filePath) {
  const lines = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const columns = parseLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseLine(line);
    if (values.length !== columns.length) throw new Error(`${filePath} 字段数量不正确`);
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  });
}

function loadCatalog() {
  const items = readCsv(catalogPath);
  const ids = new Set();
  for (const item of items) {
    if (!/^[a-z0-9-]+$/.test(item.id) || ids.has(item.id)) throw new Error(`商品 ID 无效或重复: ${item.id}`);
    if (!["sina-global", "sina-domestic"].includes(item.provider)) throw new Error(`未知数据源: ${item.provider}`);
    ids.add(item.id);
  }
  return items;
}

function cutoffDate() {
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  return cutoff.toISOString().slice(0, 10);
}

function validateRows(id, rows) {
  if (rows.length < 2) throw new Error(`${id} 日线数据不足`);
  const dates = new Set();
  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || dates.has(row.date)) throw new Error(`${id} 日期无效或重复: ${row.date}`);
    dates.add(row.date);
    for (const field of headers.slice(1)) {
      if (!Number.isFinite(Number(row[field]))) throw new Error(`${id} ${row.date} 的 ${field} 无效`);
    }
  }
  const ordered = rows.every((row, index) => index === 0 || row.date > rows[index - 1].date);
  if (!ordered) throw new Error(`${id} 日期未按升序排列`);
  const age = (Date.now() - Date.parse(`${rows.at(-1).date}T00:00:00Z`)) / 86_400_000;
  if (age > 10 || age < -2) throw new Error(`${id} 最新数据日期异常: ${rows.at(-1).date}`);
  if (rows[0].date < cutoffDate()) throw new Error(`${id} 包含超过一年的数据: ${rows[0].date}`);
}

function parsePayload(text, provider) {
  const match = text.match(/(\[.*\])/s);
  if (!match) throw new Error("数据源未返回有效 JSONP");
  const sourceRows = JSON.parse(match[1]);
  return sourceRows.map((row) => provider === "sina-global" ? {
    date: row.date, open: row.open, high: row.high, low: row.low,
    close: row.close, volume: row.volume,
  } : {
    date: row.d, open: row.o, high: row.h, low: row.l,
    close: row.c, volume: row.v,
  }).filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number(row.close) > 0);
}

async function fetchRows(item) {
  const service = item.provider === "sina-global" ? "GlobalFuturesService.getGlobalFuturesDailyKLine" : "InnerFuturesNewService.getDailyKLine";
  const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20data=/${service}?symbol=${encodeURIComponent(item.provider_symbol)}`;
  let failure;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Referer: "https://finance.sina.com.cn/", "User-Agent": "commodity-tracker/1.0" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = parsePayload(await response.text(), item.provider)
        .filter((row) => row.date >= cutoffDate()).sort((a, b) => a.date.localeCompare(b.date));
      validateRows(item.id, rows);
      return rows;
    } catch (error) {
      failure = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw new Error(`${item.id} 更新失败: ${failure instanceof Error ? failure.message : failure}`);
}

function writeRows(id, rows) {
  const filePath = join(outputDirectory, `${id}.csv`);
  const content = `${headers.join(",")}\n${rows.map((row) => headers.map((field) => row[field]).join(",")).join("\n")}\n`;
  mkdirSync(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  writeFileSync(temporaryPath, content, "utf8");
  renameSync(temporaryPath, filePath);
}

const catalog = loadCatalog();
if (checkOnly) {
  for (const item of catalog) validateRows(item.id, readCsv(join(outputDirectory, `${item.id}.csv`)));
  console.log(`已验证 ${catalog.length} 个商品 CSV，均为最近一年数据。`);
} else {
  const datasets = await Promise.all(catalog.map(async (item) => [item.id, await fetchRows(item)]));
  for (const [id, rows] of datasets) writeRows(id, rows);
  console.log(`已更新 ${datasets.length} 个商品 CSV。`);
}