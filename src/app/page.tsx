import { Dashboard } from "@/components/dashboard";
import { loadCommodities } from "@/lib/commodity-csv";
import { loadFedRateProbability } from "@/lib/fed-rate-csv";
import { loadMarginBalance } from "@/lib/margin-csv";

export default function Home() {
  return <Dashboard commodities={loadCommodities()} fedRate={loadFedRateProbability()} marginBalance={loadMarginBalance()} />;
}