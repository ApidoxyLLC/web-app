import { CustomersTable } from "@/components/customers-table";
import data from "./data.json"
export default function Page() {
  return (
    <div className="pb-4">
        <CustomersTable  />
    </div>
  );
}