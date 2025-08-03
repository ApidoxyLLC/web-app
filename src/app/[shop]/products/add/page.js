import NewProduct from "@/components/new-product-left";
import ProductTitle from "./FormInputsComponents/ProductTitle";
import ProductDescription from "./FormInputsComponents/ProductDescription";
import UploadImage from "./FormInputsComponents/UploadImage";

export default async function Page({ params }) {
  const { shop } = await params
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4">
      <div className="flex-3">
          <div className="grid grid-cols-10 gap-4 ">

            <div className="flex-1 flex flex-col gap-4 col-span-6 ">
              <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 px-6 shadow-sm">
                <div data-slot="card-title" className="leading-none font-semibold">Product basic information</div>
                <div data-slot="control-group" data-orientation="horizontal" className="flex">
                  <div data-slot="control-group-item" className="border-input selection:bg-primary selection:text-primary-foreground dark:bg-input/30 flex min-h-9 cursor-text items-center gap-2 border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm rounded-none focus-within:z-10 -me-px h-auto first:rounded-s-md last:-me-0 last:rounded-e-md">
                    <p data-slot="input-base-adornment" className="text-muted-foreground flex items-center [&amp;_svg:not([class*='size-'])]:size-4 [&amp;:not(:has(button))]:pointer-events-none">
                      Product title
                    </p>
                  </div>
                  {/* <input data-slot="input-base-control" className="placeholder:text-muted-foreground file:text-foreground w-full flex-1 bg-transparent file:border-0 file:bg-transparent file:text-sm file:font-medium focus:outline-none disabled:pointer-events-none" placeholder="ex.. Short sleeve t-shirt"/> */}
                  <ProductTitle/>
                </div>
                <ProductDescription/>
                <UploadImage shopId={shop}/>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-4 col-span-4 marker-class">

            </div>
          </div>
        <NewProduct />
      </div>
    </div>
  );
}