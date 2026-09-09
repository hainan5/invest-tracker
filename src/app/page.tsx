import { Dashboard } from "@/components/dashboard";
import { loadCommodities } from "@/lib/commodity-csv";
import { loadFedRateProbability } from "@/lib/fed-rate-csv";

export default function Home() {
  return <Dashboard commodities={loadCommodities()} fedRate={loadFedRateProbability()} />;
}