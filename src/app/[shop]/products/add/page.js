import NewProduct from "@/components/new-product-left";
import NewProductRight from "@/components/new-product-right";

export default function Page() {
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4">
      <div className="flex-3">
        <NewProduct />
      </div>
    </div>
  );
}