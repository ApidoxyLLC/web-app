import DashboardChart from "@/components/dashboard-chart";
import { TopStatistics } from "@/components/top-statistics";


export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <DashboardChart />
      <div className="flex flex-col md:flex-row gap-4">
        <TopStatistics />
        <TopStatistics />
      </div>
    </div>
  );
}
