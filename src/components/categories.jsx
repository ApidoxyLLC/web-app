"use client";

import { TreeView } from '@/components/tree-view';
import { PlusCircle, PlusIcon, Trash2, FolderPlus, LoaderIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ControlGroup,
  ControlGroupItem,
} from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import { Textarea } from './ui/textarea';
import { useParams } from 'next/navigation';
import PicturePreviewInput from './picture-preview-input';
import useFetch from '@/hooks/useFetch';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';

export default function Categories() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [slugCheck, setSlugCheck] = useState({ isAvailable: null, suggestions: [] });
  const [loadingState, setloadingState] = useState(false);
  const [newCategory, setNewCategory] = useState({
    title: "",
    slug: "",
    description: "",
    image: "",
  });
  const [debounchedValue] = useDebounce(newCategory?.slug, 500)
  const params = useParams()
  const shopId = params.shop
  const [pic,setPic] = useState(null)
  const {
    data: response,
    loading,
    error,
    refetch
  } = useFetch(`/${shopId}/categories`);
  const collections = response || [];
  useEffect(()=>{
    if (!debounchedValue){
      setSlugCheck({ isAvailable: null, suggestions: [] });
      return ;
    } 
    const checkSlug =  async ()=>{
      setloadingState(true);
      try{
        const res = await fetch(`/api/v1/categories/slug?slug=${debounchedValue}&title=${newCategory.title}&shop=${shopId}`);
        const data = await res.json();
        setSlugCheck({ isAvailable: data.isAvailable, suggestions: data.recommendations || [] });
        setloadingState(false);
      }catch(error){
        console.log("Slug check failed", err);
        setSlugCheck({ isAvailable: null, suggestions: [] });
      }
      setloadingState(false);
    }
    checkSlug()
  },[debounchedValue])

  const handleCreateCategory = async () => {
    if (!slugCheck.isAvailable) return;
    const parentId = selectedCategory?.id || null ;
    const res = await fetch(`/api/v1/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newCategory, parent: parentId, shop: shopId })
    });
    const data = await res.json();
    if (data.success) {
      refetch()
      toast.success("Category created successfully.");
      setNewCategory({ title: "", slug: "", description: "", image: undefined });
      setSlugCheck({ isAvailable: null, suggestions: [] });
      setIsOpen(false);
      setPic(null)
    } else {
      toast.error(data.error || "Category creation failed");
    }
  };

  const handleDelete = async (id) => {
  if (!confirm("Are you sure you want to delete this category?")) return;

  try {
    const res = await fetch(`/api/v1/${shopId}/categories/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (res.ok && data.success) {
      toast.success(`Category "${data.data?.title || ""}" deleted successfully.`);
      refetch(); // Refresh category list
    } else {
      toast.error(data.error || "Failed to delete category.");
    }
  } catch (error) {
    console.error("Delete failed", error);
    toast.error("Something went wrong while deleting.");
  }
};
  
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("shop", shopId);

    const res = await fetch("/api/v1/upload-image", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Image upload failed");
    }

    const imageUrl = `http://localhost:3000/api/v1/image/${shopId}/${data.data.fileName}`;
    setPic(imageUrl);

  return data?.data?.fileName;
  };
  
  const buildTree = (items, parentId = null, visited = new Set()) =>

    items
      .filter((item) => item.parent === parentId)
      .map((item) => {
        console.log(item)
        console.log(`http://localhost:3000/api/v1/image/${shopId}/${item.image.imageName}`)
        if (visited.has(item.id)) return null;
        visited.add(item.id);
        const children = buildTree(items, item.id, new Set(visited));

        return {
          ...item,
          name: (
            <div className="flex items-center gap-2 group">
              {item.image && <img src={`http://localhost:3000/api/v1/image/${shopId}/${item.image.imageName}`} alt={item.title} className="h-6 w-6 rounded" />}
              <span>{item.title}</span>
              {children.length > 0 && (
                <Badge className="text-sm h-6 bg-primary-foreground italic px-2 py-0">
                  {children.length}
                </Badge>
              )}
              <div className="flex gap-1">
                <Badge
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory(item);
                    setIsOpen(true);
                  }}
                >
                  <PlusIcon className="h-3 w-3" />
                </Badge>
                <Badge
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Badge>
              </div>
            </div>
          ),
          children,
          draggable: true,
        };
      })
      .filter(Boolean);

  const itemsTree = buildTree(collections);
  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center gap-2">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">Create, update and delete categories and subcategories</p>
        </div>
        <Button onClick={() => { setSelectedCategory(null); setIsOpen(true); }}>
          <FolderPlus className="mr-2 h-4 w-4" />
          Add Root Category
        </Button>
      </div>
      {
        loading ? <div className="">
      {[...Array(2)].map((_, idx) => (
        <div
          key={idx}
          className="h-[100px] mt-3 animate-pulse rounded-xl bg-muted/50 dark:bg-muted"
        />
      ))}
    </div> : itemsTree.length === 0 ? <div className='pt-3 font-base'>No categori added. Please creat a categori</div> : <div className="border rounded-lg ">
        <TreeView
          data={itemsTree}
          defaultLeafIcon={<PlusCircle />}
        />
      </div>
      }
      {error && <p className="text-red-500">Error loading categories.</p>}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                {selectedCategory ? `Subcategory of ${selectedCategory.title}` : 'Root level category'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-6 p-6">
            <PicturePreviewInput
              width={120}
              height={120}
              label="Upload Category Image"
              picture={pic ? pic : null}
              onChange={async (file) => {
    if (file instanceof File) {
      try {
        const uploadedUrl = await uploadImage(file);
        console.log(uploadedUrl)
        setNewCategory(prev => ({...prev,image:uploadedUrl}))
        } catch (err) {
        console.error("Upload failed", err);
        toast.error("Image upload failed");
      }
    }else{
      console.log("err")
      setPic(null); 
    }}}


            />

            <ControlGroup className="w-full">
              <ControlGroupItem>
                <InputBase><InputBaseAdornment>Title</InputBaseAdornment></InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput
                      value={newCategory.title}
                      placeholder="Enter category title"
                      onChange={(e) => setNewCategory(prev => ({
                        ...prev,
                        title: e.target.value,
                      }))}
                    />
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>

            <ControlGroup className="w-full">
              <ControlGroupItem>
                <InputBase><InputBaseAdornment>Slug</InputBaseAdornment></InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput
                      value={newCategory.slug}
                      placeholder="category-slug"
                      onChange={(e) => setNewCategory(prev => ({ ...prev, slug: e.target.value }))}
                    />
                  </InputBaseControl>
                  {loadingState && <LoaderIcon className="h-4 w-8 animate-spin" />}
                </InputBase>
              </ControlGroupItem>
              {/* <Button size="sm" onClick={checkSlug} disabled={loadingState}>Check</Button> */}
            </ControlGroup>

            {slugCheck.isAvailable === false && (
              <div className="text-sm text-red-500">
                 Slug taken. Try:
                <div className="flex flex-wrap gap-2 mt-2">
                  {slugCheck.suggestions.map(sug => (
                    <Badge key={sug} onClick={() => {
                      setNewCategory(prev => ({ ...prev, slug: sug }))
                      setSlugCheck(prev => ({
                                    ...prev,
                                    isAvailable: true
                                  }));
                      
                    }} className="cursor-pointer">
                      {sug}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Textarea
              placeholder="Category description"
              value={newCategory.description}
              onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <DialogFooter className="flex-row gap-2 p-6 pt-0">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} disabled={!slugCheck.isAvailable}>Create Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
      
    </div>
  );
}