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
import { SortableItem } from "./SortableItem";
import { Button } from "@diner-saas/ui/components/button";
import { Input } from "@diner-saas/ui/components/input";
import { Card } from "@diner-saas/ui/components/card";
import type { FetcherWithComponents } from "@remix-run/react";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image_cf_id: string | null;
  is_available: boolean;
}

interface Category {
  id: number;
  name: string;
  sort_order: number;
  items: MenuItem[];
}

interface VisualEditorProps {
  categories: Category[];
  cloudflareImagesUrl: string;
  fetcher: FetcherWithComponents<any>;
}

export function VisualEditor({ categories: initialCategories, cloudflareImagesUrl, fetcher }: VisualEditorProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      if (item.image_cf_id) {
        formData.append("imageCfId", item.image_cf_id);
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
              onChange={(e) => setNewCategoryName(e.target.value)}
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
                            !item.is_available ? "bg-gray-50 opacity-60" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {item.image_cf_id && cloudflareImagesUrl && (
                              <img
                                src={`${cloudflareImagesUrl}/${item.image_cf_id}/thumbnail`}
                                alt={item.name}
                                className="h-12 w-12 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium">
                                {item.name}
                                {!item.is_available && (
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
                              onClick={() => handle86Item(item.id, item.is_available)}
                            >
                              {item.is_available ? "86 Item" : "Re-enable"}
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
