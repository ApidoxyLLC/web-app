// Rewritten Categories component with slug checking and API-based creation

"use client";

import { TreeView } from '@/components/tree-view';
import { PlusCircle, PlusIcon, Trash2, FolderPlus } from 'lucide-react';
import { useState } from 'react';
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

export default function Categories() {
  const [collections, setCollections] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [slugCheck, setSlugCheck] = useState({ isAvailable: null, suggestions: [] });
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState({
    title: "",
    slug: "",
    description: "",
    image: "",
  });
  const [pic, setPic] = useState("")
  const params = useParams()

  console.log(pic)
  const shopId = params.shop
  const checkSlug = async () => {
    if (!newCategory.slug) return;
    setLoading(true);
    const res = await fetch(`http://localhost:3000/api/v1/categories/slug?slug=${newCategory.slug}&title=${newCategory.title}&shop=${shopId}`);
    const data = await res.json();
    setSlugCheck({ isAvailable: data.isAvailable, suggestions: data.recommendations || [] });
    setLoading(false);
  };

  const handleCreateCategory = async () => {
    if (!slugCheck.isAvailable) return;
    const parentId = selectedCategory?.id || null ;
    const res = await fetch(`http://localhost:3000/api/v1/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newCategory, parent: parentId, shop: shopId })
    });
    const data = await res.json();
    if (data.success) {
      setCollections(prev => [...prev, data.data]);
      setNewCategory({ title: "", slug: "", description: "", image: undefined });
      setSlugCheck({ isAvailable: null, suggestions: [] });
      setIsOpen(false);
    } else {
      alert(data.error || "Category creation failed");
    }
  };

  const handleDelete = (id) => {
    const deleteRecursive = (categoryId) => {
      const children = collections.filter(item => item.parent === categoryId);
      children.forEach(child => deleteRecursive(child.id));
      setCollections(prev => prev.filter(item => item.id !== categoryId));
    };
    deleteRecursive(id);
  };
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("shop", shopId);

  const res = await fetch("http://localhost:3000/api/v1/upload-image", {
    method: "POST",
    body: formData,
  });
  console.log(res)

  const data = await res.json();
  console.log(data)
  setPic(data?.data?.fileName)
  if (!data.success) {
    throw new Error(data.error || "Image upload failed");
  }
  
  return data?.data?.fileName
;
   // return uploaded image URL
};

  const  { data } = useFetch(`/image/${shopId}/${pic}`)
  console.log(data)
  const buildTree = (items, parentId = null, visited = new Set()) =>
  items
    .filter((item) => item.parent === parentId)
    .map((item) => {
      if (visited.has(item.id)) {
        return null 
      }

      visited.add(item.id);

      const children = buildTree(items, item.id, new Set(visited));

      return {
        ...item,
        name: (
          <div className="flex items-center gap-2 group">
            <img src={item.image} alt={item.title} className="h-6 w-6 rounded" />
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
              picture={newCategory?.image}
              onChange={async (file) => {
    if (file instanceof File) {
      try {
        const uploadedUrl = await uploadImage(file);
        console.log(uploadedUrl)
        setNewCategory(prev => ({ ...prev, image: uploadedUrl }));
      } catch (err) {
        console.error("Upload failed", err);
        alert("Image upload failed");
      }
    }else{
      console.log("nonono")
    }
}}

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
                </InputBase>
              </ControlGroupItem>
              <Button size="sm" onClick={checkSlug} disabled={loading}>Check</Button>
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
            {slugCheck.isAvailable === true && (
              <div className="text-sm text-green-600"> Slug is available</div>
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

      <div className="border rounded-lg">
        <TreeView
          data={itemsTree}
          defaultLeafIcon={<PlusCircle />}
          onDocumentDrag={(source, target) => {
            const newParent = target?.id || null;
            setCollections(prev => prev.map(item => item.id === source.id ? { ...item, parent: newParent } : item));
          }}
        />
      </div>
    </div>
  );
}