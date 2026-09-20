export type FedRateProbabilityPoint = {
  date: string;
  meeting: string;
  hike: number;
  hold: number;
  cut: number;
  sourceUrl: string;
};

export type FedRateProbability = FedRateProbabilityPoint & {
  history: FedRateProbabilityPoint[];
};

export type MarginBalancePoint = {
  date: string;
  finBalance: number;
  loanBalance: number;
  marginBalance: number;
  balanceRatio: number;
};

export type MarginBalance = MarginBalancePoint & {
  history: MarginBalancePoint[];
};

export type EconomicEventPoint = {
  date: string;
  category: "新股申购" | "限售解禁" | "分红除权" | "宏观数据";
  title: string;
  detail: string;
};