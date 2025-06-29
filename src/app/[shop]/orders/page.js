
import { OrdersTable } from "@/components/orders-table";
import data from "./data.json"
export default function Page() {
  return (
    <div className="pb-4">
        <OrdersTable data={data} />
    </div>
  );
}