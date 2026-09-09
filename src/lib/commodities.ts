export type CommodityCategory = "能源商品" | "金属商品" | "农副产品";

export type CategoryInfo = {
  name: CommodityCategory;
  description: string;
  examples: string;
  accent: string;
};

export const categoryInfos: CategoryInfo[] = [
  { name: "能源商品", description: "主要作为燃料和动力来源，价格受地缘政治和全球经济影响较大。", examples: "原油 · 天然气 · 煤炭 · 汽油", accent: "#315b47" },
  { name: "金属商品", description: "涵盖贵金属和工业金属，是制造业与建筑业的重要基础。", examples: "黄金 · 白银 · 铜 · 铝 · 铁矿石 · 锌 · 镍 · 碳酸锂", accent: "#a8792d" },
  { name: "农副产品", description: "来自农业和畜牧业，供应易受天气、病虫害等因素影响。", examples: "大豆 · 玉米 · 小麦 · 咖啡 · 棉花 · 糖 · 活牛", accent: "#9a6445" },
];

export type Commodity = {
  id: string;
  name: string;
  subtitle: string;
  symbol: string;
  category: CommodityCategory;
  price: number;
  unit: string;
  change: number;
  high: number;
  low: number;
  open: number;
  volume: string;
  color: string;
  history: number[];
  historyDates: string[];
  updatedAt: string;
  source: string;
  insight: string;
};

export const formatPrice = (value: number) => new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);