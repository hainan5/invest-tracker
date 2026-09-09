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