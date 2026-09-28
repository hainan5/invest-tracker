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