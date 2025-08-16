"use client"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  ControlGroup,
  ControlGroupItem,
} from "@/components/ui/control-group";
import { arraySwap } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight, GripVertical, Trash2 } from "lucide-react";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import {
  Sortable,
  SortableItem,
  SortableItemTrigger,
  SortableList,
} from "@/components/ui/sortable";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState } from "react";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import CustomTagInput from "./custom-tag-input";
import { useParams, useRouter } from "next/navigation";
import UploadImage from "@/app/[shop]/products/add/FormInputsComponents/UploadImage";
import { toast } from "sonner";
import { Router } from "next/router";
import useFetch from "@/hooks/useFetch";

export default function NewProduct() {
  const [activeTagIndex, setActiveTagIndex] = useState(null);
  const [variants, setVariants] = useState([
    { id: '1', name: '', options: [] } 
  ]);
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [activeTagIndexx, setActiveTagIndexx] = useState(null);
  const {shop} = useParams()
  const router = useRouter()
  const { data, loading, error } = useFetch(`/${shop}/categories`);
  const [productData, setProductData] = useState({
  shop,
  title: "",
  description: "",
  images: [],
  category: "",
  isPhysical: true,
  weight: 0,
  weightUnit:"",
  price: 0,
  compareAtPrice: 0,
  costPerItem: 0,
  profit: 0,
  margin: 0,
  sellWithOutStock: false,
  sku: "",
  barcode: "",
  isFreeShiping: false,
  variants: variants.map(({ name, options }) => ({ name, options })),
  status: "active",
  type: "",
  vendor: "",
  tags:[]
});
console.log(productData)
  const handleChange = (key, value) => {
  setProductData((prev) => ({
    ...prev,
    [key]: typeof prev[key] === "number" ? Number(value)
         : typeof prev[key] === "boolean" ? Boolean(value)
         : value,
  }));
  };
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setVariants((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arraySwap(items, oldIndex, newIndex);
      });
    }
  };
  const addVariant = () => {
    if (variants.length < 3) {
      setVariants([
        ...variants, 
        { id: String(variants.length + 1), name: '', options: [] }
      ]);
    }
  };
  const deleteVariant = (variantId) => {
    setVariants(variants.filter(v => v.id !== variantId));
  };
  const renderCollectionMenu = (categories) => {
    return categories.map((cat) =>
      cat.children && cat.children.length > 0 ? (
        <DropdownMenuSub key={cat.id}>
          <DropdownMenuSubTrigger>
            {cat.title}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            {renderCollectionMenu(cat.children)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ) : (
        <DropdownMenuItem key={cat.id} onClick={() => handleSelect(cat)}>
          {cat.title}
        </DropdownMenuItem>
      )
    );
  };
 const handleCheckbox = (key, value) => {
    setProductData((prev) => ({
      ...prev,
      [key]: value === true,
    }));
  };
  const handleImageUpload = (url) => {
  console.log("urllll",url)
  setProductData((prev) => ({
    ...prev,
    images: [...prev.images, url],
  }))
  }
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("shop", shop);

    const res = await fetch("/api/v1/logo/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Image upload failed");
    }

    const imageUrl = `http://localhost:3000/api/v1/image/${shop}/${data.data.fileName}`;
    setPic(imageUrl);

  return data?.data?.fileName;
  };
   const handleSelect = (cat) => {
    setSelectedCategory(cat.title);
    setProductData((prev) => ({
      ...prev,
      category: cat.title,
    }));
  };
  const categoryTree = useMemo(() => {
    if (!data) return [];
    const map = {};
    data.forEach((cat) => {
      map[cat.id] = { ...cat, children: [] };
    });
    const tree = [];
    data.forEach((cat) => {
      if (cat.parent && map[cat.parent]) {
        map[cat.parent].children.push(map[cat.id]);
      } else {
        tree.push(map[cat.id]);
      }
    });
    return tree;
  }, [data]);
  const handleSubmit = async () => {
   try {
  const response = await fetch("/api/v1/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  console.log("✅ Product created:", data);
  toast.success("Product created successfully!");
  router.push(`/${shop}/products`)
} catch (err) {
  toast.error("Error submitting product. Check console.");
}

  };
  return (
    <div className="grid grid-cols-10 gap-4">
      <div className="flex-1 flex flex-col gap-4 col-span-6">
      <Card>
        <CardHeader>
          <CardTitle>Product basic information</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ControlGroup>
            <ControlGroupItem>
              <InputBase>
                <InputBaseAdornment>Product title</InputBaseAdornment>
              </InputBase>
            </ControlGroupItem>
            <ControlGroupItem className="flex-1">
              <InputBase>
                <InputBaseControl>
                  <InputBaseInput placeholder="Short sleeve t-shirt" 
                    onChange={(e) => handleChange("title", e.target.value)}
/>
                </InputBaseControl>
              </InputBase>
            </ControlGroupItem>
          </ControlGroup>

            <Textarea 
            placeholder="Product description" 
            onChange={(e) => handleChange("description", e.target.value)}
            />
            <UploadImage shopId = {shop} onImageUpload={handleImageUpload} ></UploadImage>

             <ControlGroup className="w-full">
      <ControlGroupItem className="flex-1">
        <Button variant="outline">{selectedCategory}</Button>
      </ControlGroupItem>

      <DropdownMenu>
        <ControlGroupItem>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline">
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
        </ControlGroupItem>

        <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
          {loading && <DropdownMenuItem>Loading...</DropdownMenuItem>}
          {error && <DropdownMenuItem>Error loading</DropdownMenuItem>}
          {categoryTree.length > 0 && renderCollectionMenu(categoryTree)}

        </DropdownMenuContent>
      </DropdownMenu>
    </ControlGroup>
      

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <ControlGroup>
              <ControlGroupItem>
                <InputBase>
                  <InputBaseAdornment>Price</InputBaseAdornment>
                </InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput placeholder="0.00" onChange={(e)=>{handleChange("price",e.target.value)}} />
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>

            <ControlGroup>
              <ControlGroupItem>
                <InputBase>
                  <InputBaseAdornment>Compare-at price</InputBaseAdornment>
                </InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput placeholder="0.00" onChange={(e)=>{
                      handleChange("compareAtPrice",e.target.value)
                    }} />
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="terms" defaultChecked />
            <Label htmlFor="terms">Charge tax on this product</Label>
          </div>
          <ControlGroup>
              <ControlGroupItem>
                <InputBase>
                  <InputBaseAdornment>Cost per item</InputBaseAdornment>
                </InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput placeholder="0.00" onChange={(e)=>{
                      handleChange("costPerItem",e.target.value)
                    }}/>
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>
            <div className="flex flex-col md:flex-row gap-4">
               <ControlGroup className="flex-1">
                <ControlGroupItem>
                  <InputBase>
                    <InputBaseAdornment>Profit</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="flex-1">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput placeholder="0.00" onChange={(e)=>{
                      handleChange("profit",e.target.value)
                    }}/>
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>
              <ControlGroup className="flex-1">
                <ControlGroupItem>
                  <InputBase>
                    <InputBaseAdornment>Margin</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="flex-1">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput placeholder="0.00" onChange={(e)=>{
                      handleChange("margin",e.target.value)
                    }}/>
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-3">
            <Checkbox
            checked={productData.sellWithOutStock}
            onCheckedChange={(val) => handleCheckbox("sellWithOutStock", val)}
          />
            <Label htmlFor="outOfStock">Continue selling when out of stock</Label>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <ControlGroup className="flex-1">
              <ControlGroupItem>
                <InputBase>
                  <InputBaseAdornment>SKU</InputBaseAdornment>
                </InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput placeholder="Enter SKU" onChange={(e)=>{
                      handleChange("sku",e.target.value)
                    }}/>
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>

            <ControlGroup className="flex-1">
              <ControlGroupItem>
                <InputBase>
                  <InputBaseAdornment>Barcode</InputBaseAdornment>
                </InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput placeholder="Enter barcode" onChange={(e)=>{
                      handleChange("barcode",e.target.value)
                    }}/>
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-3">
           <Checkbox
            checked={productData.isFreeShiping}
            onCheckedChange={(val) => handleCheckbox("isFreeShiping", val)}
          />
            <Label htmlFor="freeShipment">Free shipment</Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
            checked={productData.isPhysical}
            onCheckedChange={(val) => handleCheckbox("isPhysical", val)}
          />
            <Label htmlFor="physicalProduct">This is a physical product</Label>
          </div>
          
          <ControlGroup>
            <ControlGroupItem>
              <InputBase>
                <InputBaseAdornment>Weight</InputBaseAdornment>
              </InputBase>
            </ControlGroupItem>
            <ControlGroupItem className="flex-1">
              <InputBase>
                <InputBaseControl>
                  <InputBaseInput placeholder="0.0" onChange={(e)=>{
                      handleChange("weight",e.target.value)
                    }}/>
                </InputBaseControl>
              </InputBase>
            </ControlGroupItem>
            <Select defaultValue="kg" onValueChange={(value) =>
        setProductData((prev) => ({ ...prev, weightUnit: value }))
      }>
              <ControlGroupItem>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
              </ControlGroupItem>
              <SelectContent align="end" >
                <SelectItem value="lb">lb</SelectItem>
                <SelectItem value="og">og</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="g">g</SelectItem>
              </SelectContent>
            </Select>
          </ControlGroup>
          
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Variants</CardTitle>
          {variants.length < 3 && (
            <Button
              onClick={addVariant}
              className="h-8 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 rounded-md text-sm font-medium"
            >
              Add variant
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Sortable onDragEnd={handleDragEnd}>
          <SortableList
            items={variants}
            className="flex flex-col gap-3"
          >
            {variants.map((variant) => (
              <SortableItem key={variant.id} id={variant.id}>
                <Card className={cn("group focus-visible:ring-ring cursor-grab flex-row items-stretch gap-0 overflow-hidden rounded-md p-0 focus-visible:ring-1 focus-visible:outline-none")}>
                  <SortableItemTrigger className="bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground flex cursor-grab items-center justify-center p-4 transition-colors aria-pressed:cursor-grabbing">
                    <GripVertical className="size-4" />
                  </SortableItemTrigger>
                  
                  <CardContent className="py-4 flex flex-1 flex-col gap-4">
                    <div className="flex flex-row gap-3">
                      <ControlGroup className="flex-1">
                        <ControlGroupItem>
                          <InputBase>
                            <InputBaseAdornment>
                              Variant {variants.indexOf(variant) + 1}
                            </InputBaseAdornment>
                          </InputBase>
                        </ControlGroupItem>
                        <ControlGroupItem className="flex-1">
                          <InputBase>
                            <InputBaseControl>
                              <InputBaseInput 
                                placeholder="Variant name (e.g. Size, Color)"
                                value={variant.name}
                                onChange={(e) => {
  const newVariants = [...variants];
  newVariants[variants.indexOf(variant)].name = e.target.value;
  setVariants(newVariants);
  setProductData((prev) => ({
    ...prev,
    variants: newVariants.map(({ name, options }) => ({ name, options })),
  }));
}}

                              />
                            </InputBaseControl>
                          </InputBase>
                        </ControlGroupItem>
                      </ControlGroup>
                      <Button
                        onClick={() => deleteVariant(variant.id)}
                        className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        variant="outline"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    
                    
                    <CustomTagInput
  placeholder="Add variant values"
  tags={variant.options}
  setTags={(newTags) => {
  const newVariants = [...variants];
  newVariants[variants.indexOf(variant)].options = newTags;
  setVariants(newVariants);
  setProductData((prev) => ({
    ...prev,
    variants: newVariants.map(({ name, options }) => ({ name, options })),
  }));
}}

  activeTagIndex={activeTagIndex}
  setActiveTagIndex={setActiveTagIndex}
/>
                  </CardContent>
                </Card>
              </SortableItem>
            ))}
          </SortableList>
        </Sortable>
        </CardContent>
      </Card>
      </div>
      <div className="flex-1 flex flex-col gap-4 col-span-4">
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Select defaultValue={productData.status}
      onValueChange={(value) =>
        setProductData((prev) => ({ ...prev, status: value }))
      }>
            <SelectTrigger className="w-full flex-1">
                <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                </SelectGroup>
            </SelectContent>
            </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product organization</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ControlGroup>
            <ControlGroupItem>
              <InputBase>
                <InputBaseAdornment>Type</InputBaseAdornment>
              </InputBase>
            </ControlGroupItem>
            <ControlGroupItem className="flex-1">
              <InputBase>
                <InputBaseControl>
                  <InputBaseInput onChange={(e)=>{handleChange("type",e.target.value)}}/>
                </InputBaseControl>
              </InputBase>
            </ControlGroupItem>
          </ControlGroup>
          <ControlGroup>
            <ControlGroupItem>
              <InputBase>
                <InputBaseAdornment>Vendor</InputBaseAdornment>
              </InputBase>
            </ControlGroupItem>
            <ControlGroupItem className="flex-1">
              <InputBase>
                <InputBaseControl>
                  <InputBaseInput onChange={(e)=>{handleChange("vendor",e.target.value)}} />
                </InputBaseControl>
              </InputBase>
            </ControlGroupItem>
          </ControlGroup>
          <CustomTagInput
            placeholder="Add tag"
            tags={productData.tags}
            setTags={(newTags) => {
                // setTag(newTags);
                setProductData((prev => ({...prev, tags : newTags })))
            }}
            activeTagIndexx={activeTagIndexx}
            setActiveTagIndexx={setActiveTagIndexx}
        />
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} className="cursor-pointer w-full">
        Save product
      </Button>
      </div>
    </div>
  );
}

// Helper to build nested menu
const buildMenuTree = (collections, parent = null) =>
  collections
    .filter((item) => item.parent === parent)
    .map((item) => ({
      ...item,
      children: buildMenuTree(collections, item.id),
    }));

// Recursive menu renderer
const renderMenuItems = (items) =>
  items.map((item) =>
    item.children && item.children.length > 0 ? (
      <DropdownMenuItem key={item.id} className="p-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="justify-between w-full px-2"
              style={{ textAlign: "left" }}
            >
              {item.title}
              <ChevronDown className="ml-2 w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {renderMenuItems(item.children)}
          </DropdownMenuContent>
        </DropdownMenu>
      </DropdownMenuItem>
    ) : (
      <DropdownMenuItem key={item.id}>{item.title}</DropdownMenuItem>
    )
  );