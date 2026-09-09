import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { FedRateProbability, FedRateProbabilityPoint } from "@/lib/macro";

const headers = ["date", "meeting", "hike", "hold", "cut", "source_url"];

export function loadFedRateProbability(): FedRateProbability {
  const filePath = join(process.cwd(), "public", "data", "macro", "fed-rate-probability.csv");
  const lines = readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  if (lines[0] !== headers.join(",")) throw new Error("美联储概率 CSV 表头不正确");
  const history = lines.slice(1).filter(Boolean).map((line, index): FedRateProbabilityPoint => {
    const values = line.split(",");
    if (values.length !== headers.length) throw new Error(`美联储概率 CSV 第 ${index + 2} 行字段数量不正确`);
    const [date, meeting, hikeValue, holdValue, cutValue, sourceUrl] = values;
    const [hike, hold, cut] = [hikeValue, holdValue, cutValue].map(Number);
    if (![hike, hold, cut].every(Number.isFinite)) throw new Error(`美联储概率 CSV 第 ${index + 2} 行数值无效`);
    return { date, meeting, hike, hold, cut, sourceUrl };
  });
  if (history.length < 2) throw new Error("美联储概率历史数据不足");
  return { ...history.at(-1)!, history };
}