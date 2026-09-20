import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { EconomicEventPoint } from "@/lib/macro";

const headers = ["date", "time_beijing", "city", "event_type", "impact", "title"];
const validImpacts = new Set(["高", "中", "低"]);

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
  if (parseCsvLine(lines[0]).join(",") !== headers.join(",")) throw new Error("财经事件 CSV 表头不正确");
  const events = lines.slice(1).filter(Boolean).map((line, index): EconomicEventPoint => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) throw new Error(`财经事件 CSV 第 ${index + 2} 行字段数量不正确`);
    const [date, timeBeijing, city, eventType, impact, title] = values;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`财经事件 CSV 第 ${index + 2} 行日期无效`);
    if (!/^\d{2}:\d{2}$/.test(timeBeijing)) throw new Error(`财经事件 CSV 第 ${index + 2} 行时间无效`);
    if (!validImpacts.has(impact)) throw new Error(`财经事件 CSV 第 ${index + 2} 行影响等级无效`);
    if (!title) throw new Error(`财经事件 CSV 第 ${index + 2} 行标题为空`);
    return { date, timeBeijing, city, eventType, impact: impact as EconomicEventPoint["impact"], title };
  });
  if (events.length < 2) throw new Error("财经事件数据不足");
  const ordered = events.every((event, index) => index === 0 || `${event.date} ${event.timeBeijing}` >= `${events[index - 1].date} ${events[index - 1].timeBeijing}`);
  if (!ordered) throw new Error("财经事件 CSV 未按时间升序排列");
  return events;
}
