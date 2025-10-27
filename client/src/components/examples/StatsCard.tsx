import StatsCard from "../StatsCard";
import { Package } from "lucide-react";

export default function StatsCardExample() {
  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard title="Total Devices" value={250} icon={Package} />
    </div>
  );
}
