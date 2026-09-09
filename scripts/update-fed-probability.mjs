import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const topicUrl = "https://xnews.jin10.com/topic/379";
const outputPath = join(process.cwd(), "public", "data", "macro", "fed-rate-probability.csv");
const headers = ["date", "meeting", "hike", "hold", "cut", "source_url"];
const checkOnly = process.argv.includes("--check");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines[0] !== headers.join(",")) throw new Error("美联储概率 CSV 表头不正确");
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(",");
    if (values.length !== headers.length) throw new Error("美联储概率 CSV 字段数量不正确");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function cutoffDate() {
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  return cutoff.toISOString().slice(0, 10);
}

function chinaDate(timestamp) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(Number(timestamp)));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function sumMatches(text, expression) {
  const total = [...text.matchAll(expression)].reduce((sum, match) => sum + Number(match[1]), 0);
  return Math.round(total * 10) / 10;
}

function parseArticle(html, sourceUrl) {
  const timestamp = html.match(/offset=(\d{13})/)?.[1];
  const text = html.replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ");
  const sentence = text.match(/美联储到[^。]{10,240}。/)?.[0];
  if (!timestamp || !sentence) return null;
  const date = chinaDate(timestamp);
  const meetingLabel = sentence.match(/美联储到(.+?)(?=维持利率不变|累计加息|加息|累计降息|降息)/)?.[1];
  const hold = Number(sentence.match(/维持利率不变的概率为([0-9.]+)%/)?.[1] ?? 0);
  const hike = sumMatches(sentence, /(?:累计)?加息[^，。%]*?概率为([0-9.]+)%/g);
  const cut = sumMatches(sentence, /(?:累计)?降息[^，。%]*?概率为([0-9.]+)%/g);
  const total = hold + hike + cut;
  if (!meetingLabel || total < 99 || total > 101) return null;
  const reportMonth = Number(date.slice(5, 7));
  const meetingMonth = Number(meetingLabel.match(/([0-9]+)月/)?.[1]);
  const meetingYear = Number(date.slice(0, 4)) + (meetingMonth < reportMonth ? 1 : 0);
  return { date, meeting: `${meetingYear}年${meetingLabel}`, hike, hold, cut, source_url: sourceUrl };
}

function validate(rows) {
  if (rows.length < 2) throw new Error("美联储概率历史数据不足");
  const dates = new Set();
  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || dates.has(row.date)) throw new Error(`概率日期无效或重复: ${row.date}`);
    dates.add(row.date);
    const total = Number(row.hike) + Number(row.hold) + Number(row.cut);
    if (![row.hike, row.hold, row.cut].every((value) => Number.isFinite(Number(value))) || total < 99 || total > 101) {
      throw new Error(`${row.date} 的概率数据无效`);
    }
  }
  if (!rows.every((row, index) => index === 0 || row.date > rows[index - 1].date)) throw new Error("概率日期未按升序排列");
  if (rows[0].date < cutoffDate()) throw new Error("概率 CSV 包含超过一年的数据");
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "commodity-tracker/1.0" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url} 返回 HTTP ${response.status}`);
  return response.text();
}

async function update() {
  const topic = await fetchText(topicUrl);
  const links = [...new Set([...topic.matchAll(/https:\/\/xnews\.jin10\.com\/details\/flash\/[0-9]+/g)].map((match) => match[0]))];
  if (links.length === 0) throw new Error("未找到美联储概率来源文章");
  const fetched = (await Promise.all(links.map(async (url) => parseArticle(await fetchText(url), url)))).filter(Boolean);
  const existing = existsSync(outputPath) ? parseCsv(readFileSync(outputPath, "utf8")) : [];
  const merged = new Map(existing.map((row) => [row.date, row]));
  for (const row of fetched) merged.set(row.date, row);
  const rows = [...merged.values()].filter((row) => row.date >= cutoffDate()).sort((a, b) => a.date.localeCompare(b.date));
  validate(rows);
  const content = `${headers.join(",")}\n${rows.map((row) => headers.map((header) => row[header]).join(",")).join("\n")}\n`;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(`${outputPath}.tmp`, content, "utf8");
  renameSync(`${outputPath}.tmp`, outputPath);
  console.log(`已更新 ${rows.length} 条美联储概率记录。`);
}

if (checkOnly) {
  const rows = parseCsv(readFileSync(outputPath, "utf8"));
  validate(rows);
  console.log(`已验证 ${rows.length} 条美联储概率记录。`);
} else await update();