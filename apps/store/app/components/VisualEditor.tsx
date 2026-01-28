import * as React from "react";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SortableItem } from "./SortableItem";
import { Button } from "@diner-saas/ui/button";
import { Input } from "@diner-saas/ui/input";
import { Card } from "@diner-saas/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@diner-saas/ui/dialog";
import { Progress } from "@diner-saas/ui/progress";
import { SparklesIcon } from "lucide-react";
import { INTENTS } from "@diner-saas/db/intents";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageCfId: string | null;
  isAvailable: boolean;
  ingredients?: string;
}

interface Category {
  id: number;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

async function handleMenuMutation(formData: FormData) {
  const response = await fetch("/dashboard/menu", { method: "POST", body: formData });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "A server error occurred.");
  }
  return response.json();
}

export function VisualEditor({ categories: initialCategories, cloudflareImagesUrl }: VisualEditorProps) {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: async () => {
      const res = await fetch("/dashboard/menu");
      const data = await res.json();
      return data.categories;
    },
    initialData: initialCategories,
  });

  const mutation = useMutation({
    mutationFn: handleMenuMutation,
    onSuccess: (data, variables) => {
      toast.success("Changes saved successfully!");
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
      if (variables.get('intent') === INTENTS.generateDescription && data.description) {
        setEditingItem(prev => prev ? { ...prev, description: data.description } : null);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const formData = new FormData();
    formData.append("intent", "create-category");
    formData.append("name", newCategoryName);
    formData.append("sortOrder", categories.length.toString());
    
    fetcher.submit(formData, { method: "post" });
    
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const handleDeleteCategory = (categoryId: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    const formData = new FormData();
    formData.append("intent", "delete-category");
    formData.append("id", categoryId.toString());
    
    fetcher.submit(formData, { method: "post" });
  };

  const handle86Item = (itemId: number, currentAvailability: boolean) => {
    const formData = new FormData();
    formData.append("intent", "update-item");
    formData.append("id", itemId.toString());
    formData.append("isAvailable", (!currentAvailability).toString());
    
    // Need to include other fields (not changing them)
    const item = categories
      .flatMap((c) => c.items)
      .find((i) => i.id === itemId);
    
    if (item) {
      formData.append("name", item.name);
      formData.append("description", item.description);
      formData.append("price", item.price.toString());
      if (item.imageCfId) {
        formData.append("imageCfId", item.imageCfId);
      }
    }
    
    fetcher.submit(formData, { method: "post" });
  };

  const handleRequestUploadUrl = async () => {
    const formData = new FormData();
    formData.append("intent", "request-upload-url");
    
    fetcher.submit(formData, { method: "post" });
  };

  const handleGenerateDescription = () => {
    if (!editingItem?.name) return;
    setIsGenerating(true);
    const formData = new FormData();
    formData.append("intent", "generate-description");
    formData.append("name", editingItem.name);
    if (editingItem.ingredients) {
      formData.append("ingredients", editingItem.ingredients);
    }
    fetcher.submit(formData, { method: "post" });
  };

  const handleSaveItem = () => {
    if (!editingItem) return;
    const formData = new FormData();
    formData.append("intent", "update-item");
    formData.append("id", editingItem.id.toString());
    formData.append("name", editingItem.name);
    formData.append("description", editingItem.description);
    formData.append("price", editingItem.price.toString());
    formData.append("isAvailable", editingItem.isAvailable.toString());
    if (editingItem.imageCfId) {
        formData.append("imageCfId", editingItem.imageCfId);
    }
    fetcher.submit(formData, { method: "post" });
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      {/* Add Category Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Categories</h2>
        {!isAddingCategory ? (
          <Button onClick={() => setIsAddingCategory(true)}>
            + Add Category
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory();
                if (e.key === "Escape") {
                  setIsAddingCategory(false);
                  setNewCategoryName("");
                }
              }}
              autoFocus
            />
            <Button onClick={handleAddCategory}>Save</Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingCategory(false);
                setNewCategoryName("");
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Draggable Categories */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {categories.map((category) => (
            <SortableItem key={category.id} id={category.id}>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      className="cursor-grab text-gray-400 hover:text-gray-600"
                      aria-label="Drag to reorder"
                    >
                      ⋮⋮
                    </button>
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <span className="text-sm text-gray-500">
                      ({category.items.length} items)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedCategoryId(
                          expandedCategoryId === category.id ? null : category.id
                        )
                      }
                    >
                      {expandedCategoryId === category.id ? "Collapse" : "Expand"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Items List */}
                {expandedCategoryId === category.id && (
                  <div className="mt-4 space-y-2">
                    {category.items.length === 0 ? (
                      <p className="text-sm text-gray-500">No items in this category</p>
                    ) : (
                      category.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between rounded border p-3 ${
                            !item.isAvailable ? "bg-gray-50 opacity-60" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {item.imageCfId && cloudflareImagesUrl && (
                              <img
                                src={`${cloudflareImagesUrl}/${item.imageCfId}/thumbnail`}
                                alt={item.name}
                                className="h-12 w-12 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium">
                                {item.name}
                                {!item.isAvailable && (
                                  <span className="ml-2 text-red-600">(86'd)</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handle86Item(item.id, item.isAvailable)}
                            >
                              {item.isAvailable ? "86 Item" : "Re-enable"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingItem(item)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>

      {/* Item Editor Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Make changes to your menu item here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          {editingItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right text-sm font-medium">
                  Name
                </label>
                <Input
                  id="name"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="ingredients" className="text-right text-sm font-medium">
                  Ingredients
                </label>
                <Input
                  id="ingredients"
                  value={editingItem.ingredients || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, ingredients: e.target.value })}
                  className="col-span-3"
                  placeholder="e.g., tomatoes, basil, mozzarella"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <label htmlFor="description" className="text-right text-sm font-medium pt-2">
                  Description
                </label>
                <div className="col-span-3 space-y-2">
                    <textarea
                      id="description"
                      value={editingItem.description}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleGenerateDescription}
                        disabled={isGenerating || !editingItem.name}
                        className="w-full gap-2 text-blue-600"
                    >
                        <SparklesIcon className="h-4 w-4" />
                        {isGenerating ? "Generating..." : "Generate with AI"}
                    </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="price" className="text-right text-sm font-medium">
                  Price ($)
                </label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                  className="col-span-3"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleSaveItem}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draggable Categories logic ... */}

    </div>
  );
}

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Reorder categories
    setCategories((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(items, oldIndex, newIndex);
      
      // Update sort_order in backend
      const orderData = reordered.map((cat, index) => ({
        id: cat.id,
        sortOrder: index,
      }));

      const formData = new FormData();
      formData.append("intent", "reorder-categories");
      formData.append("order", JSON.stringify(orderData));
      fetcher.submit(formData, { method: "post" });

      return reordered;
    });
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const formData = new FormData();
    formData.append("intent", "create-category");
    formData.append("name", newCategoryName);
    formData.append("sortOrder", categories.length.toString());
    
    fetcher.submit(formData, { method: "post" });
    
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const handleDeleteCategory = (categoryId: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    const formData = new FormData();
    formData.append("intent", "delete-category");
    formData.append("id", categoryId.toString());
    
    fetcher.submit(formData, { method: "post" });
  };

  const handle86Item = (itemId: number, currentAvailability: boolean) => {
    const formData = new FormData();
    formData.append("intent", "update-item");
    formData.append("id", itemId.toString());
    formData.append("isAvailable", (!currentAvailability).toString());
    
    // Need to include other fields (not changing them)
    const item = categories
      .flatMap((c) => c.items)
      .find((i) => i.id === itemId);
    
    if (item) {
      formData.append("name", item.name);
      formData.append("description", item.description);
      formData.append("price", item.price.toString());
      if (item.imageCfId) {
        formData.append("imageCfId", item.imageCfId);
      }
    }
    
    fetcher.submit(formData, { method: "post" });
  };

  const handleRequestUploadUrl = async () => {
    const formData = new FormData();
    formData.append("intent", "request-upload-url");
    
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <div className="space-y-4">
      {/* Add Category Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Categories</h2>
        {!isAddingCategory ? (
          <Button onClick={() => setIsAddingCategory(true)}>
            + Add Category
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory();
                if (e.key === "Escape") {
                  setIsAddingCategory(false);
                  setNewCategoryName("");
                }
              }}
              autoFocus
            />
            <Button onClick={handleAddCategory}>Save</Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingCategory(false);
                setNewCategoryName("");
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Draggable Categories */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {categories.map((category) => (
            <SortableItem key={category.id} id={category.id}>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      className="cursor-grab text-gray-400 hover:text-gray-600"
                      aria-label="Drag to reorder"
                    >
                      ⋮⋮
                    </button>
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <span className="text-sm text-gray-500">
                      ({category.items.length} items)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedCategoryId(
                          expandedCategoryId === category.id ? null : category.id
                        )
                      }
                    >
                      {expandedCategoryId === category.id ? "Collapse" : "Expand"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Items List */}
                {expandedCategoryId === category.id && (
                  <div className="mt-4 space-y-2">
                    {category.items.length === 0 ? (
                      <p className="text-sm text-gray-500">No items in this category</p>
                    ) : (
                      category.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between rounded border p-3 ${
                            !item.isAvailable ? "bg-gray-50 opacity-60" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {item.imageCfId && cloudflareImagesUrl && (
                              <img
                                src={`${cloudflareImagesUrl}/${item.imageCfId}/thumbnail`}
                                alt={item.name}
                                className="h-12 w-12 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium">
                                {item.name}
                                {!item.isAvailable && (
                                  <span className="ml-2 text-red-600">(86'd)</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handle86Item(item.id, item.isAvailable)}
                            >
                              {item.isAvailable ? "86 Item" : "Re-enable"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingItem(item)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>

      {/* TODO: Add item creation/editing modal */}
      {/* TODO: Add Cloudflare Images upload UI */}
    </div>
  );
}