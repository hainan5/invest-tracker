import { Dashboard } from "@/components/dashboard";
import { loadCommodities } from "@/lib/commodity-csv";
import { loadFedRateProbability } from "@/lib/fed-rate-csv";
import { loadMarginBalance } from "@/lib/margin-csv";
import { loadEconomicEvents, loadMorningBrief } from "@/lib/economic-events-csv";

export default function Home() {
  return <Dashboard commodities={loadCommodities()} fedRate={loadFedRateProbability()} marginBalance={loadMarginBalance()} economicEvents={loadEconomicEvents()} morningBrief={loadMorningBrief()} />;
}