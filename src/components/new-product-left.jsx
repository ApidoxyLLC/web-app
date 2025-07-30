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
  Dropzone,
  DropzoneDescription,
  DropzoneGroup,
  DropzoneInput,
  DropzoneTitle,
  DropzoneUploadIcon,
  DropzoneZone,
} from "@/components/ui/dropzone";
import {
  FileList,
  FileListDescription,
  FileListHeader,
  FileListIcon,
  FileListInfo,
  FileListItem,
  FileListName,
  FileListSize,
} from "@/components/ui/file-list";

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
import { useState } from "react";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import CustomTagInput from "./custom-tag-input";

export default function NewProduct() {
  const [files, setFiles] = useState([]);
  const [activeTagIndex, setActiveTagIndex] = useState(null);
  const [variants, setVariants] = useState([
    { id: '1', name: '', tags: [] } 
  ]);
  const [collections, setCollections] = useState([
    { id: "123456789", title: "Clothing", handle: "clothing", description: "All clothing items.", image: "https://placehold.co/400x400.png", cover: "https://placehold.co/400x400.png", parent: null },
    { id: "987654321", title: "Men's Clothing", handle: "mens-clothing", description: "Trendy men's clothing.", image: "https://placehold.co/400x400.png", cover: "https://placehold.co/400x400.png", parent: "123456789" },
    { id: "567890123", title: "Jackets", handle: "mens-jackets", description: "Stylish jackets for men.", image: "https://placehold.co/400x400.png", cover: "https://placehold.co/400x400.png", parent: "987654321" },
    { id: "567890124", title: "Shirts", handle: "mens-shirts", description: "Casual and formal shirts for men.", image: "https://placehold.co/400x400.png", cover: "https://placehold.co/400x400.png", parent: "987654321" },
    { id: "987654322", title: "Women's Clothing", handle: "womens-clothing", description: "Stylish women's fashion.", image: "https://placehold.co/400x400.png", cover: "https://placehold.co/400x400.png", parent: "123456789" },
    { id: "567890125", title: "Dresses", handle: "womens-dresses", description: "Elegant dresses for all occasions.", image: "https://placehold.co/400x400.png", cover: "https://placehold.co/400x400.png", parent: "987654322" },
    { id: "567890126", title: "Tops", handle: "womens-tops", description: "Trendy tops for everyday wear.", image: "https://placehold.co/400x400.png", cover: "https://placehold.co/400x400.png", parent: "987654322" },
    { id: "123456743489", title: "Food and beverage", handle: "food-beverage", description: "All food and drink items.", image: "https://placehold.co/400x400.png", cover: "https://placehold.co/400x400.png", parent: null },
    { id: "1245573456789", title: "Plastics", handle: "plastics", description: "Plastic materials and goods.", image: "https://placehold.co/400x400.png", cover: "https://placehold.co/400x400.png", parent: null },
    { id: "12345645454789", title: "Fabrics", handle: "fabrics", description: "Various fabric types.", image: "https://placehold.co/400x400.png", cover: "https://placehold.co/400x400.png", parent: null },
    { id: "123445456789", title: "Chemicals", handle: "chemicals", description: "Chemical products and materials.", image: "https://placehold.co/400x400.png", cover: "https://placehold.co/400x400.png", parent: null },
  ]);
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [tags, setTag] = useState([]);
  const [activeTagIndexx, setActiveTagIndexx] = useState(null);
  const [productData, setProductData] = useState({
  title: "",
  description: "",
  price: "",
  compareAtPrice: "",
  cost: "",
  profit: "",
  margin: "",
  sku: "",
  barcode: "",
  weight: "",
  unit: "",
  selectedCategory: "",
  variants: [],
  type: "",
  vendor: "",
  tags: [],
  status: "active",
  files: [],
  outOfStock: false,
  physicalProduct: true,
  freeShipment: false,
  chargeTax: true,
});
  const handleChange = (key,value)=>{
    setProductData((prev) => ({...prev, [key]: value}))
  }
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
        { id: String(variants.length + 1), name: '', tags: [] }
      ]);
    }
  };

  const deleteVariant = (variantId) => {
    setVariants(variants.filter(v => v.id !== variantId));
  };

  const renderCollectionMenu = (items) => {
    const buildNestedMenu = (parent = null) => {
      const children = items.filter(item => item.parent === parent);
      
      return children.map(item => {
        const hasChildren = items.some(child => child.parent === item.id);
        
        if (hasChildren) {
          return (
            <DropdownMenuItem key={item.id} className="p-0">
              <DropdownMenu>
                <DropdownMenuTrigger 
                  className="w-full px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <div className="flex items-center justify-between">
                    {item.title}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  side="right" 
                  className="w-48"
                  align="start"
                  sideOffset={-5}
                >
                  {buildNestedMenu(item.id)}
                </DropdownMenuContent>
              </DropdownMenu>
            </DropdownMenuItem>
          );
        }
        
        return (
          <DropdownMenuItem 
            key={item.id}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCategory(item.title);
            }}
            onSelect={(e) => {
              e.preventDefault();
            }}
          >
            {item.title}
          </DropdownMenuItem>
        );
      });
    };

    return buildNestedMenu(null);
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
                  onChange={()=> handleChange('title', e.target.value)} />
                </InputBaseControl>
              </InputBase>
            </ControlGroupItem>
          </ControlGroup>

            <Textarea placeholder="Product description" onChange={()=> handleChange('discription', e.target.value)} />


            <Dropzone
              accept={{
                "image/*": [".jpg", ".png"],
                "application/pdf": [".pdf"],
              }}
              onDropAccepted={setFiles}
            >
              <div className="grid gap-4">
                <DropzoneZone>
                  <DropzoneInput />
                  <DropzoneGroup className="gap-4">
                    <DropzoneUploadIcon />
                    <DropzoneGroup>
                      <DropzoneTitle>Drop product images here or click to upload</DropzoneTitle>
                      <DropzoneDescription>
                        You can upload files up to 10MB in size. Supported formats: JPG,
                        PNG, PDF.
                      </DropzoneDescription>
                    </DropzoneGroup>
                  </DropzoneGroup>
                </DropzoneZone>
                <FileList>
                  {files.map((file) => (
                    <FileListItem key={file.name}>
                      <FileListHeader>
                        <FileListIcon />
                        <FileListInfo>
                          <FileListName>{file.name}</FileListName>
                          <FileListDescription>
                            <FileListSize>{file.size}</FileListSize>
                          </FileListDescription>
                        </FileListInfo>
                      </FileListHeader>
                    </FileListItem>
                  ))}
                </FileList>
              </div>
            </Dropzone>

            <ControlGroup>
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
                <DropdownMenuContent align="end" className="w-48">
                  {renderCollectionMenu(collections)}
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
                      handleChange("cost",e.target.value)
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
            <Checkbox id="outOfStock" />
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
            <Checkbox id="freeShipment" />
            <Label htmlFor="freeShipment">Free shipment</Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="physicalProduct" defaultChecked />
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
            <Select defaultValue="kg">
              <ControlGroupItem>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Currency" defaultValue="0" onChange={(e)=>{
                      handleChange("unit",e.target.value)
                    }}/>
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
                                  handleChange("varient",)
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

                    
                    {/* <TagInput
                      placeholder="Add variant values"
                      tags={variant.tags}
                      setTags={(newTags) => {
                        const newVariants = [...variants];
                        newVariants[variants.indexOf(variant)].tags = newTags;
                        setVariants(newVariants);
                      }}
                      activeTagIndex={activeTagIndex}
                      setActiveTagIndex={setActiveTagIndex}
                    /> */}
                    <CustomTagInput
  placeholder="Add variant values"
  tags={variant.tags}
  setTags={(newTags) => {
    const newVariants = [...variants];
    newVariants[variants.indexOf(variant)].tags = newTags;
    setVariants(newVariants);
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
          <Select defaultValue="active">
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
                  <InputBaseInput/>
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
                  <InputBaseInput/>
                </InputBaseControl>
              </InputBase>
            </ControlGroupItem>
          </ControlGroup>
          <CustomTagInput
            placeholder="Add tag"
            tags={tags}
            setTags={(newTags) => {
                setTag(newTags);
            }}
            activeTagIndexx={activeTagIndexx}
            setActiveTagIndexx={setActiveTagIndexx}
        />
        </CardContent>
      </Card>

      <Button className="cursor-pointer w-full">
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