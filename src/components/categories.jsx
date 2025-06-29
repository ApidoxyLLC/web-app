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
import PicturePreviewInput from "@/components/picture-preview-input";

export default function Categories() {
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
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    title: "",
    handle: "",
    description: "",
    image: null,
  });

  const buildTree = (items, parentId = null) =>
    items
      .filter((item) => item.parent === parentId)
      .map((item) => ({        ...item,        name: (          <div className="flex items-center gap-2">
            <img src={item.image} alt={item.title} className="h-6 w-6 rounded" />
            <span>{item.title}</span>
            <div className="flex items-center gap-1">
              {buildTree(items, item.id).length > 0 && (
                <Badge variant="outlined" className="text-sm h-6 bg-primary-foreground rounded-sm italic px-2 py-0 font-normal">
                  {buildTree(items, item.id).length}
                </Badge>
              )}
              <div className="flex gap-1">
                <Badge
                  variant="default"
                  size="sm"
                  className="h-6 px-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory(item);
                    setIsOpen(true);
                  }}
                >
                  <PlusIcon className="h-3 w-3" />
                </Badge>
                <Badge
                  variant="destructive"
                  size="sm"
                  className="h-6 px-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Badge>
              </div>
            </div>
          </div>
        ),
        actions: (
          <div className="flex gap-2">
          </div>
        ),
        children: buildTree(items, item.id),
        draggable: true,
      }));

  const handleDelete = (id) => {
    // Recursively delete category and its children
    const deleteRecursive = (categoryId) => {
      const children = collections.filter(item => item.parent === categoryId);
      children.forEach(child => deleteRecursive(child.id));
      setCollections(prev => prev.filter(item => item.id !== categoryId));
    };
    deleteRecursive(id);
  };

  const handleCreateCategory = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const parentId = selectedCategory ? selectedCategory.id : null;
    
    setCollections(prev => [...prev, {
      id: newId,
      parent: parentId,
      image: "https://placehold.co/400x400.png",
      cover: "https://placehold.co/400x400.png",
      ...newCategory
    }]);

    setNewCategory({ title: "", handle: "", description: "" });
    setIsOpen(false);
  };

  const itemsTree = buildTree(collections);

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center gap-2">
        <div className="truncate text-ellipsis">
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground text-ellipsis">Create, update and delete categories and subcategories</p>
        </div>
        <Button 
          onClick={() => {
            setSelectedCategory(null);
            setIsOpen(true);
          }}
        >
          <FolderPlus className="mr-2 h-4 w-4" />
          Add Root Category
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Create New Category</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground m-0">
                {selectedCategory ? `Subcategory of ${selectedCategory.title}` : 'Root level category'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-6 p-6">
            <div className="flex justify-center">
              <PicturePreviewInput
                width={120}
                height={120}
                label="Upload Category Image"
                picture={newCategory.image}
                onChange={(url) => setNewCategory(prev => ({ ...prev, image: url }))}
              />
            </div>
            <ControlGroup className="w-full">
              <ControlGroupItem>
                <InputBase>
                  <InputBaseAdornment>Title</InputBaseAdornment>
                </InputBase>
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
                        handle: e.target.value.toLowerCase().replace(/ /g, '-')
                      }))}
                    />
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>

            <ControlGroup className="w-full">
              <ControlGroupItem>
                <InputBase>
                  <InputBaseAdornment>Handle</InputBaseAdornment>
                </InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput
                      value={newCategory.handle}
                      placeholder="category-handle"
                      onChange={(e) => setNewCategory(prev => ({
                        ...prev,
                        handle: e.target.value
                      }))}
                    />
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>
          </div>
          <DialogFooter className="flex-row gap-2 p-6 pt-0">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg">
        <TreeView 
          data={itemsTree} 
          defaultLeafIcon={<PlusCircle />}
          onDocumentDrag={(source, target) => {
            if (target.id) {
              setCollections(prev => prev.map(item => 
                item.id === source.id ? {...item, parent: target.id} : item
              ));
            } else {
              setCollections(prev => prev.map(item => 
                item.id === source.id ? {...item, parent: null} : item
              ));
            }
          }}
        />
      </div>
    </div>
  );
}
