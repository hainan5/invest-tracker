import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { MarginBalance, MarginBalancePoint } from "@/lib/macro";

const headers = ["date", "fin_balance", "loan_balance", "margin_balance", "balance_ratio"];

export function loadMarginBalance(): MarginBalance {
  const filePath = join(process.cwd(), "public", "data", "macro", "margin-balance.csv");
  const lines = readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  if (lines[0] !== headers.join(",")) throw new Error("融资融券 CSV 表头不正确");
  const history = lines.slice(1).filter(Boolean).map((line, index): MarginBalancePoint => {
    const values = line.split(",");
    if (values.length !== headers.length) throw new Error(`融资融券 CSV 第 ${index + 2} 行字段数量不正确`);
    const [date, finValue, loanValue, marginValue, ratioValue] = values;
    const [finBalance, loanBalance, marginBalance, balanceRatio] = [finValue, loanValue, marginValue, ratioValue].map(Number);
    if (![finBalance, loanBalance, marginBalance, balanceRatio].every(Number.isFinite)) throw new Error(`融资融券 CSV 第 ${index + 2} 行数值无效`);
    if (marginBalance <= 0) throw new Error(`融资融券 CSV 第 ${index + 2} 行余额必须为正数`);
    return { date, finBalance, loanBalance, marginBalance, balanceRatio };
  });
  if (history.length < 2) throw new Error("融资融券历史数据不足");
  return { ...history.at(-1)!, history };
}
