import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Commodity, CommodityCategory } from "@/lib/commodities";

const validCategories = new Set<CommodityCategory>(["能源商品", "金属商品", "农副产品"]);
const catalogHeaders = ["id", "name", "subtitle", "symbol", "category", "unit", "color", "provider", "provider_symbol", "insight"];
const priceHeaders = ["date", "open", "high", "low", "close", "volume"];

function parseCsvLine(line: string) {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      fields.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  fields.push(value.trim());
  return fields;
}

function numberValue(value: string, field: string, row: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`CSV 第 ${row} 行的 ${field} 不是有效数字`);
  return parsed;
}

function loadRows(filePath: string, required: string[]) {
  const lines = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  if (headers.join(",") !== required.join(",")) throw new Error(`${filePath} 的 CSV 表头不符合预期格式`);
  return lines.slice(1).filter(Boolean).map((line, index) => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) throw new Error(`${filePath} 第 ${index + 2} 行字段数量不正确`);
    return Object.fromEntries(headers.map((header, fieldIndex) => [header, values[fieldIndex]]));
  });
}

function formatVolume(value: number) {
  if (value <= 0) return "--";
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function loadCommodities(): Commodity[] {
  const dataDirectory = join(process.cwd(), "public", "data");
  return loadRows(join(dataDirectory, "commodities.csv"), catalogHeaders).map((record, index) => {
    const row = index + 2;
    if (!validCategories.has(record.category as CommodityCategory)) throw new Error(`CSV 第 ${row} 行分类无效`);
    if (!/^[a-z0-9-]+$/.test(record.id)) throw new Error(`CSV 第 ${row} 行商品 ID 无效`);
    const prices = loadRows(join(dataDirectory, "commodities", `${record.id}.csv`), priceHeaders);
    if (prices.length < 2) throw new Error(`${record.id}.csv 至少需要两个历史数据点`);
    const parsed = prices.map((price, priceIndex) => ({
      date: price.date,
      open: numberValue(price.open, "open", priceIndex + 2),
      high: numberValue(price.high, "high", priceIndex + 2),
      low: numberValue(price.low, "low", priceIndex + 2),
      close: numberValue(price.close, "close", priceIndex + 2),
      volume: numberValue(price.volume, "volume", priceIndex + 2),
    }));
    const latest = parsed.at(-1)!;
    const previous = parsed.at(-2)!;
    const rawChange = previous.close === 0 ? 0 : ((latest.close - previous.close) / previous.close) * 100;
    return {
      id: record.id, name: record.name, subtitle: record.subtitle, symbol: record.symbol,
      category: record.category as CommodityCategory,
      price: latest.close, unit: record.unit, change: Math.round(rawChange * 100) / 100,
      high: latest.high, low: latest.low, open: latest.open, volume: formatVolume(latest.volume),
      color: record.color, history: parsed.map((price) => price.close),
      historyDates: parsed.map((price) => price.date), updatedAt: latest.date,
      source: "新浪财经", insight: record.insight,
    };
  });
}