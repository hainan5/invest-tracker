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

export type PizzaReading = {
  name: string;
  busy: number;
  typical: number;
  deviation: number;
  anomaly: boolean;
};

export type PentagonPizza = {
  snapshot: string;
  avgBusy: number;
  maxBusy: number;
  maxDeviation: number;
  anomalyCount: number;
  locationCount: number;
  lateNight: boolean;
  readings: PizzaReading[];
};