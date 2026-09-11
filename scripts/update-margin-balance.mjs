#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// 东方财富数据中心"沪深两市融资融券交易总量"报表（公开页面:
// https://data.eastmoney.com/rzrq/total.html ），余额单位为亿元人民币。
const apiUrl = "https://datacenter-web.eastmoney.com/api/data/v1/get";
const outputPath = join(process.cwd(), "public", "data", "macro", "margin-balance.csv");
const headers = ["date", "fin_balance", "loan_balance", "margin_balance", "balance_ratio"];
const checkOnly = process.argv.includes("--check");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines[0] !== headers.join(",")) throw new Error("融资融券 CSV 表头不正确");
  return lines.slice(1).filter(Boolean).map((line, index) => {
    const values = line.split(",");
    if (values.length !== headers.length) throw new Error(`融资融券 CSV 第 ${index + 2} 行字段数量不正确`);
    return Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex]]));
  });
}

function validate(rows) {
  if (rows.length < 2) throw new Error("融资融券历史数据不足");
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error(`融资融券 CSV 第 ${index + 2} 行日期格式不正确`);
    const numbers = [row.fin_balance, row.loan_balance, row.margin_balance, row.balance_ratio].map(Number);
    if (!numbers.every((value) => Number.isFinite(value) && value >= 0)) throw new Error(`融资融券 CSV 第 ${index + 2} 行数值无效`);
    if (row.margin_balance === "0") throw new Error(`融资融券 CSV 第 ${index + 2} 行余额为零`);
    if (Math.abs(Number(row.fin_balance) + Number(row.loan_balance) - Number(row.margin_balance)) > 0.5) throw new Error(`融资融券 CSV 第 ${index + 2} 行融资与融券余额之和不等于总余额`);
    if (index > 0 && row.date <= rows[index - 1].date) throw new Error("融资融券 CSV 日期必须升序且唯一");
  }
}

async function fetchPage(pageNumber) {
  const query = new URLSearchParams({
    reportName: "RPTA_WEB_MARGIN_DAILYTRADE",
    columns: "STATISTICS_DATE,FIN_BALANCE,LOAN_BALANCE,MARGIN_BALANCE,BALANCE_RATIO",
    pageSize: "500",
    pageNumber: String(pageNumber),
    sortColumns: "STATISTICS_DATE",
    sortTypes: "-1",
    source: "WEB",
    client: "WEB",
  });
  const response = await fetch(`${apiUrl}?${query}`, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" } });
  if (!response.ok) throw new Error(`东方财富接口 HTTP ${response.status}`);
  const payload = await response.json();
  const rows = payload?.result?.data;
  if (!payload?.success || !Array.isArray(rows) || rows.length === 0) throw new Error("东方财富接口返回为空");
  return rows;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function mapRow(entry) {
  const date = String(entry.STATISTICS_DATE).slice(0, 10);
  const numbers = [entry.FIN_BALANCE, entry.LOAN_BALANCE, entry.MARGIN_BALANCE, entry.BALANCE_RATIO].map((value) => Number(value));
  if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !numbers.every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error(`东方财富接口返回了无法解析的记录: ${JSON.stringify(entry)}`);
  }
  return {
    date,
    fin_balance: round(numbers[0]),
    loan_balance: round(numbers[1]),
    margin_balance: round(numbers[2]),
    balance_ratio: round(numbers[3]),
  };
}

function cutoffDate() {
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  return cutoff.toISOString().slice(0, 10);
}

async function update() {
  // 第一页为最新 500 条（超过一年交易日），一页即可覆盖滚动窗口。
  const fetched = (await fetchPage(1)).map(mapRow);
  const cutoff = cutoffDate();
  const rows = fetched.filter((row) => row.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
  validate(rows);
  const ageDays = (Date.now() - Date.parse(`${rows.at(-1).date}T00:00:00Z`)) / 86_400_000;
  if (ageDays > 7) throw new Error(`融资融券最新数据日期过旧: ${rows.at(-1).date}`);
  const content = `${headers.join(",")}\n${rows.map((row) => headers.map((header) => row[header]).join(",")).join("\n")}\n`;
  const previousContent = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";
  if (content === previousContent) {
    console.log(`融资融券余额无新数据，最新记录为 ${rows.at(-1).date}。`);
    return;
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(`${outputPath}.tmp`, content, "utf8");
  renameSync(`${outputPath}.tmp`, outputPath);
  console.log(`已更新 ${rows.length} 条融资融券余额记录，最新为 ${rows.at(-1).date}。`);
}

if (checkOnly) {
  const rows = parseCsv(readFileSync(outputPath, "utf8"));
  validate(rows);
  console.log(`已验证 ${rows.length} 条融资融券余额记录。`);
} else await update();
