import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PentagonPizza, PizzaReading } from "@/lib/macro";

const historyHeaders = ["snapshot", "avg_busy", "max_busy", "max_deviation", "anomaly_count", "location_count", "late_night"];
const locationHeaders = ["snapshot", "name", "busy", "typical", "deviation", "anomaly"];

export function loadPentagonPizza(): PentagonPizza {
  const directory = join(process.cwd(), "public", "data", "macro");
  const historyLines = readFileSync(join(directory, "pentagon-pizza.csv"), "utf8").trim().split(/\r?\n/);
  if (historyLines[0] !== historyHeaders.join(",")) throw new Error("披萨指数 CSV 表头不正确");
  const latest = historyLines.filter(Boolean).at(-1);
  if (!latest) throw new Error("披萨指数历史数据不足");
  const values = latest.split(",");
  if (values.length !== historyHeaders.length) throw new Error("披萨指数 CSV 字段数量不正确");
  const [snapshot, avgBusy, maxBusy, maxDeviation, anomalyCount, locationCount, lateNight] = values;
  const [avg, max, deviation, anomalies, locations] = [avgBusy, maxBusy, maxDeviation, anomalyCount, locationCount].map(Number);
  if (![avg, max, deviation, anomalies, locations].every(Number.isFinite)) throw new Error("披萨指数 CSV 数值无效");

  const locationLines = readFileSync(join(directory, "pentagon-pizza-locations.csv"), "utf8").trim().split(/\r?\n/);
  if (locationLines[0] !== locationHeaders.join(",")) throw new Error("披萨指数门店 CSV 表头不正确");
  const readings: PizzaReading[] = locationLines.slice(1).filter(Boolean).map((line, index) => {
    const fields = line.split(",");
    if (fields.length !== locationHeaders.length) throw new Error(`披萨指数门店 CSV 第 ${index + 2} 行字段数量不正确`);
    const [rowSnapshot, name, busy, typical, rowDeviation, anomaly] = fields;
    if (rowSnapshot !== snapshot) throw new Error("披萨指数门店数据与历史快照时间不一致");
    return {
      name,
      busy: Number(busy),
      typical: Number(typical),
      deviation: Number(rowDeviation),
      anomaly: anomaly === "true",
    };
  });
  if (readings.length === 0) throw new Error("披萨指数门店数据为空");

  return {
    snapshot,
    avgBusy: avg,
    maxBusy: max,
    maxDeviation: deviation,
    anomalyCount: anomalies,
    locationCount: locations,
    lateNight: lateNight === "true",
    readings,
  };
}
