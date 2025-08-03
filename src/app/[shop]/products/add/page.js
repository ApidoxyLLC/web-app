import NewProduct from "@/components/new-product-left";

export default async function Page({ params }) {
  const { shop } = await params
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4">
      <div className="flex-3">
        <NewProduct />
      </div>
    </div>
  );
}