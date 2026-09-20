import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { EconomicEventPoint, MorningBriefPoint } from "@/lib/macro";

const headers = ["date", "category", "title", "detail"];
const validCategories = new Set(["新股申购", "限售解禁", "分红除权", "宏观数据"]);

function parseCsvLine(line: string) {
  const fields: string[] = [];
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

export function loadEconomicEvents(): EconomicEventPoint[] {
  const filePath = join(process.cwd(), "public", "data", "macro", "economic-events.csv");
  const lines = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (parseCsvLine(lines[0]).join(",") !== headers.join(",")) throw new Error("A股日历 CSV 表头不正确");
  const events = lines.slice(1).filter(Boolean).map((line, index): EconomicEventPoint => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) throw new Error(`A股日历 CSV 第 ${index + 2} 行字段数量不正确`);
    const [date, category, title, detail] = values;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`A股日历 CSV 第 ${index + 2} 行日期无效`);
    if (!validCategories.has(category)) throw new Error(`A股日历 CSV 第 ${index + 2} 行分类无效`);
    if (!title) throw new Error(`A股日历 CSV 第 ${index + 2} 行标题为空`);
    return { date, category: category as EconomicEventPoint["category"], title, detail };
  });
  if (events.length < 2) throw new Error("A股日历数据不足");
  const ordered = events.every((event, index) => index === 0 || event.date >= events[index - 1].date);
  if (!ordered) throw new Error("A股日历 CSV 未按日期升序排列");
  return events;
}

const newsHeaders = ["date", "section", "content"];
const validSections = new Set(["要闻", "关注"]);

export function loadMorningBrief(): MorningBriefPoint[] {
  const filePath = join(process.cwd(), "public", "data", "macro", "morning-brief.csv");
  const lines = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (parseCsvLine(lines[0]).join(",") !== newsHeaders.join(",")) throw new Error("金十早餐 CSV 表头不正确");
  const briefs = lines.slice(1).filter(Boolean).map((line, index): MorningBriefPoint => {
    const values = parseCsvLine(line);
    if (values.length !== newsHeaders.length) throw new Error(`金十早餐 CSV 第 ${index + 2} 行字段数量不正确`);
    const [date, section, content] = values;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`金十早餐 CSV 第 ${index + 2} 行日期无效`);
    if (!validSections.has(section)) throw new Error(`金十早餐 CSV 第 ${index + 2} 行栏目无效`);
    if (!content) throw new Error(`金十早餐 CSV 第 ${index + 2} 行内容为空`);
    return { date, section: section as MorningBriefPoint["section"], content };
  });
  if (briefs.length === 0) throw new Error("金十早餐数据不足");
  return briefs;
}
