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

// ... (interfaces)

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

  // ... (and so on, converting all fetcher.submit calls to mutation.mutate)

  return (
    <div>
        {/* The entire UI is now driven by the `categories` data from useQuery */}
        {/* All buttons that used to call fetcher.submit now call mutation.mutate */}
    </div>
  );
}