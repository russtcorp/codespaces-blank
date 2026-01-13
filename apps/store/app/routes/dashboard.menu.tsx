import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { createDb, createTenantDb, categories, menuItems } from '@diner/db';
import { eq, and } from 'drizzle-orm';
import { requireUserSession } from '~/services/auth.server';
import { invalidatePublicCache } from '~/utils/cache.server';
import { requirePermission } from '~/utils/permissions';
import { PERMISSIONS } from '@diner/config';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@diner/ui';

type Category = {
  id: number;
  name: string;
  sortOrder: number;
  itemCount: number;
};

type MenuItem = {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  imageUrl: string | null;
  dietaryTags: string | null;
  dietaryTagsVerified: boolean;
  version: number;
};

function SortableCategory({
  category,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 text-gray-400 hover:text-gray-600"
      >
        ⋮⋮
      </button>
      <button
        onClick={onSelect}
        className={`flex-1 rounded-md px-3 py-2 text-left text-sm ${
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        {category.name}
        <span className="ml-2 text-xs opacity-70">({category.itemCount})</span>
      </button>
      <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 w-8 p-0">
        ✏️
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete} className="h-8 w-8 p-0">
        🗑️
      </Button>
    </div>
  );
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  // Check permission
  requirePermission(session, PERMISSIONS.MENU_FULL_ACCESS);

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, session.tenantId);

  const cats = await tdb.select(categories);
  const items = await tdb.select(menuItems);

  const categoriesWithCounts: Category[] = cats.map((cat) => ({
    id: cat.id,
    name: cat.name,
    sortOrder: cat.sortOrder,
    itemCount: items.filter((item) => item.categoryId === cat.id).length,
  }));

  return json({
    categories: categoriesWithCounts.sort((a, b) => a.sortOrder - b.sortOrder),
    items: items as MenuItem[],
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  const formData = await request.formData();
  const intent = formData.get('intent');

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, session.tenantId);

  try {
    if (intent === 'add-category') {
      const name = formData.get('name');
      if (!name || typeof name !== 'string') {
        return json({ error: 'Name required' }, { status: 400 });
      }

      const existing = await tdb.select(categories);
      const maxSort = Math.max(...existing.map((c) => c.sortOrder), 0);

      await tdb.insert(categories, {
        name,
        sortOrder: maxSort + 1,
        isVisible: true,
      });

      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Category added' });
    }

    if (intent === 'edit-category') {
      const id = formData.get('id');
      const name = formData.get('name');
      if (!id || !name || typeof name !== 'string') {
        return json({ error: 'ID and name required' }, { status: 400 });
      }

      await tdb.update(categories, { name }, eq(categories.id, parseInt(id.toString(), 10)));
      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Category updated' });
    }

    if (intent === 'delete-category') {
      const id = formData.get('id');
      if (!id) {
        return json({ error: 'ID required' }, { status: 400 });
      }

      await db.delete(categories).where(eq(categories.id, parseInt(id.toString(), 10)));
      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Category deleted' });
    }

    if (intent === 'add-item' || intent === 'edit-item') {
      const id = formData.get('id');
      const categoryId = formData.get('categoryId');
      const name = formData.get('name');
      const description = formData.get('description');
      const price = formData.get('price');
      const dietaryTags = formData.get('dietaryTags');
      const dietaryTagsVerified = formData.get('dietaryTagsVerified') === 'true';

      if (!categoryId || !name || !price) {
        return json({ error: 'Category, name, and price required' }, { status: 400 });
      }

      const itemData = {
        categoryId: parseInt(categoryId.toString(), 10),
        name: name.toString(),
        description: description ? description.toString() : null,
        price: parseFloat(price.toString()),
        dietaryTags: dietaryTags ? dietaryTags.toString() : null,
        dietaryTagsVerified,
        isAvailable: true,
        imageUrl: formData.get('imageUrl')?.toString() || null,
      };

      if (intent === 'edit-item' && id) {
        const version = formData.get('version');
        const idInt = parseInt(id.toString(), 10);
        const verInt = version ? parseInt(version.toString(), 10) : 0;

        await tdb.update(
          menuItems,
          { ...itemData, version: verInt + 1 },
          and(eq(menuItems.id, idInt), eq(menuItems.version, verInt))
        );

        const [updated] = await tdb.select(menuItems, eq(menuItems.id, idInt));
        if (!updated || updated.version !== verInt + 1) {
          return json({ error: 'Conflict: item was modified by someone else. Please reload.', code: 'conflict' }, { status: 409 });
        }

        await invalidatePublicCache(env, session.tenantId);
        return json({ success: true, message: 'Item updated' });
      } else {
        await tdb.insert(menuItems, itemData);
        await invalidatePublicCache(env, session.tenantId);
        return json({ success: true, message: 'Item added' });
      }
    }

    if (intent === 'delete-item') {
      const id = formData.get('id');
      if (!id) {
        return json({ error: 'ID required' }, { status: 400 });
      }

      await tdb.softDelete(menuItems, eq(menuItems.id, parseInt(id.toString(), 10)));
      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Item deleted' });
    }

    if (intent === 'reorder-categories') {
      const orderData = formData.get('order');
      if (!orderData) {
        return json({ error: 'Order data required' }, { status: 400 });
      }

      const order = JSON.parse(orderData.toString()) as number[];
      
      // Update sort_order for each category
      for (let i = 0; i < order.length; i++) {
        await tdb.update(categories, { sortOrder: i }, eq(categories.id, order[i]));
      }

      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Categories reordered' });
    }

    if (intent === 'toggle-availability') {
      const itemId = formData.get('itemId');
      if (!itemId) {
        return json({ error: 'Item ID required' }, { status: 400 });
      }

      const id = parseInt(itemId.toString(), 10);
      const version = formData.get('version');
      const verInt = version ? parseInt(version.toString(), 10) : 0;
      const [item] = await tdb.select(menuItems, eq(menuItems.id, id));

      if (item) {
        await tdb.update(
          menuItems,
          { isAvailable: !item.isAvailable, version: verInt + 1 },
          and(eq(menuItems.id, id), eq(menuItems.version, verInt))
        );
        const [updated] = await tdb.select(menuItems, eq(menuItems.id, id));
        if (!updated || updated.version !== verInt + 1) {
          return json({ error: 'Conflict: item was modified by someone else. Please reload.', code: 'conflict' }, { status: 409 });
        }
        await invalidatePublicCache(env, session.tenantId);
        return json({ success: true, message: item.isAvailable ? "Item 86'd" : 'Item available' });
      }

      return json({ error: 'Item not found' }, { status: 404 });
    }

    if (intent === 'bulk-toggle') {
      const itemIds = formData.get('itemIds');
      const available = formData.get('available') === 'true';
      const versionsRaw = formData.get('versions');
      
      if (!itemIds) {
        return json({ error: 'Item IDs required' }, { status: 400 });
      }

      const ids = JSON.parse(itemIds.toString()) as number[];
      const versions = versionsRaw ? (JSON.parse(versionsRaw.toString()) as Record<number, number>) : {};

      let successCount = 0;
      for (const id of ids) {
        const ver = versions[id] ?? 0;
        await tdb.update(
          menuItems,
          { isAvailable: available, version: ver + 1 },
          and(eq(menuItems.id, id), eq(menuItems.version, ver))
        );
        const [updated] = await tdb.select(menuItems, eq(menuItems.id, id));
        if (updated && updated.version === ver + 1) successCount++;
      }

      await invalidatePublicCache(env, session.tenantId);
      const failed = ids.length - successCount;
      const message = `${successCount} items ${available ? 'enabled' : "86'd"}${failed ? `, ${failed} conflicts` : ''}`;
      return json({ success: true, message });
    }

    if (intent === 'bulk-delete') {
      const itemIds = formData.get('itemIds');
      
      if (!itemIds) {
        return json({ error: 'Item IDs required' }, { status: 400 });
      }

      const ids = JSON.parse(itemIds.toString()) as number[];
      
      for (const id of ids) {
        await tdb.softDelete(menuItems, eq(menuItems.id, id));
      }

      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: `${ids.length} items deleted` });
    }

    return json({ error: 'Unknown intent' }, { status: 400 });
  } catch (error) {
    console.error('Action error:', error);
    return json({ error: 'Operation failed' }, { status: 500 });
  }
}

export default function MenuEditor() {
  const { categories: cats, items } = useLoaderData<typeof loader>();
  const [localCategories, setLocalCategories] = useState(cats);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    cats.length > 0 ? cats[0].id : null
  );
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'category' | 'item'; id: number } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [analyzingAllergens, setAnalyzingAllergens] = useState(false);
  const [aiDescription, setAiDescription] = useState<string>('');  const [aiAllergens, setAiAllergens] = useState<string[]>([]);
  const fetcher = useFetcher();
  const reorderFetcher = useFetcher();
  const bulkFetcher = useFetcher();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalCategories(cats);
  }, [cats]);

  const selectedCategory = localCategories.find((c) => c.id === selectedCategoryId);
  const categoryItems = items
    .filter((item) => item.categoryId === selectedCategoryId)
    .filter((item) => 
      searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localCategories.findIndex((c) => c.id === active.id);
    const newIndex = localCategories.findIndex((c) => c.id === over.id);

    const reordered = arrayMove(localCategories, oldIndex, newIndex);
    setLocalCategories(reordered);

    // Submit reorder
    const formData = new FormData();
    formData.append('intent', 'reorder-categories');
    formData.append('order', JSON.stringify(reordered.map((c) => c.id)));
    reorderFetcher.submit(formData, { method: 'post' });
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setShowItemModal(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setImagePreview(item.imageUrl);
    setShowItemModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        setImagePreview(data.url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!editingItem?.name) return;
    setGeneratingDescription(true);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName: editingItem.name }),
      });
      const data = await response.json();
      if (data.description) {
        setAiDescription(data.description);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleAnalyzeAllergens = async () => {
    if (!editingItem?.name && !editingItem?.description) return;
    setAnalyzingAllergens(true);
    try {
      const response = await fetch('/api/ai/analyze-allergens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: editingItem.name,
          description: editingItem.description,
        }),
      });
      const data = await response.json();
      if (data.allergens) {
        setAiAllergens(data.allergens);
      }
    } catch (error) {
      console.error('Allergen analysis failed:', error);
    } finally {
      setAnalyzingAllergens(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Menu Editor</h2>
          <p className="text-gray-600">Manage your menu items and categories</p>
        </div>
        <Button onClick={() => setShowAddCategory(true)}>Add Category</Button>
      </div>

      {/* Add/Edit Category Modal */}
      <Dialog open={showAddCategory || editingCategory !== null} onOpenChange={(open) => !open && (setShowAddCategory(false), setEditingCategory(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value={editingCategory ? 'edit-category' : 'add-category'} />
            {editingCategory && <input type="hidden" name="id" value={editingCategory.id} />}
            <div>
              <label htmlFor="cat-name" className="block text-sm font-medium">Name</label>
              <Input
                id="cat-name"
                name="name"
                defaultValue={editingCategory?.name}
                placeholder="Category name"
                required
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => (setShowAddCategory(false), setEditingCategory(null))}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCategory ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Modal */}
      <Dialog open={showItemModal} onOpenChange={(open) => !open && (setShowItemModal(false), setEditingItem(null))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value={editingItem ? 'edit-item' : 'add-item'} />
            {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
            {editingItem && <input type="hidden" name="version" value={editingItem.version} />}
            <input type="hidden" name="categoryId" value={selectedCategoryId || ''} />
            {imagePreview && <input type="hidden" name="imageUrl" value={imagePreview} />}
            
            <div>
              <label className="block text-sm font-medium">Image</label>
              <div className="mt-1 space-y-2">
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="h-32 w-32 rounded-md object-cover" />
                )}
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                {uploadingImage && <p className="text-xs text-gray-500">Uploading...</p>}
              </div>
            </div>

            <div>
              <label htmlFor="item-name" className="block text-sm font-medium">Name</label>
              <Input
                id="item-name"
                name="name"
                defaultValue={editingItem?.name}
                required
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium">Description</label>
              <div className="mt-1 space-y-2">
                <textarea
                  id="description"
                  name="description"
                  defaultValue={editingItem?.description || ''}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateDescription}
                    disabled={generatingDescription || !editingItem?.name}
                  >
                    {generatingDescription ? 'Generating...' : '✨ Generate with AI'}
                  </Button>
                  {aiDescription && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const textarea = document.getElementById('description') as HTMLTextAreaElement;
                        if (textarea) textarea.value = aiDescription;
                        setAiDescription('');
                      }}
                    >
                      Use AI suggestion
                    </Button>
                  )}
                </div>
                {aiDescription && (
                  <div className="rounded-md bg-blue-50 p-2 text-sm text-blue-900">
                    <strong>AI Suggestion:</strong> {aiDescription}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium">Price</label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editingItem?.price}
                required
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="dietaryTags" className="block text-sm font-medium">Dietary Tags (comma-separated)</label>
              <div className="mt-1 space-y-2">
                <Input
                  id="dietaryTags"
                  name="dietaryTags"
                  defaultValue={editingItem?.dietaryTags || ''}
                  placeholder="GF, V, VG"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAnalyzeAllergens}
                    disabled={analyzingAllergens}
                  >
                    {analyzingAllergens ? 'Analyzing...' : '🔍 Analyze Allergens'}
                  </Button>
                  {aiAllergens.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const input = document.getElementById('dietaryTags') as HTMLInputElement;
                        if (input) input.value = aiAllergens.join(', ');
                        setAiAllergens([]);
                      }}
                    >
                      Use detected tags
                    </Button>
                  )}
                </div>
                {aiAllergens.length > 0 && (
                  <div className="rounded-md bg-yellow-50 p-2 text-sm text-yellow-900">
                    <strong>Detected:</strong> {aiAllergens.join(', ')}
                  </div>
                )}
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="dietaryTagsVerified"
                  value="true"
                  defaultChecked={editingItem?.dietaryTagsVerified}
                  className="rounded"
                />
                Verified (required to show tags publicly)
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => (setShowItemModal(false), setEditingItem(null))}>
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this {confirmDelete?.type}? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value={`delete-${confirmDelete?.type}`} />
              <input type="hidden" name="id" value={confirmDelete?.id} />
              <Button type="submit" variant="destructive">Delete</Button>
            </fetcher.Form>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Category List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localCategories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {localCategories.map((cat) => (
                    <SortableCategory
                      key={cat.id}
                      category={cat}
                      isSelected={selectedCategoryId === cat.id}
                      onSelect={() => setSelectedCategoryId(cat.id)}
                      onEdit={() => setEditingCategory(cat)}
                      onDelete={() => setConfirmDelete({ type: 'category', id: cat.id })}
                    />
                  ))}
                  {localCategories.length === 0 && (
                    <p className="text-sm text-muted-foreground">No categories yet</p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        {/* Items List */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedCategory?.name || 'Select a category'}</span>
              <div className="flex gap-2">
                <Input
                  type="search"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48"
                />
                {selectedCategory && (
                  <Button onClick={handleAddItem} size="sm">Add Item</Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItems.size > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-blue-50 p-3">
                <span className="text-sm font-medium">{selectedItems.size} items selected</span>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const formData = new FormData();
                      formData.append('intent', 'bulk-toggle');
                      formData.append('itemIds', JSON.stringify(Array.from(selectedItems)));
                      formData.append('available', 'true');
                      formData.append('versions', JSON.stringify(items.reduce((acc, it) => {
                        if (selectedItems.has(it.id)) acc[it.id] = it.version;
                        return acc;
                      }, {} as Record<number, number>)));
                      bulkFetcher.submit(formData, { method: 'post' });
                      setSelectedItems(new Set());
                    }}
                  >
                    Enable All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const formData = new FormData();
                      formData.append('intent', 'bulk-toggle');
                      formData.append('itemIds', JSON.stringify(Array.from(selectedItems)));
                      formData.append('available', 'false');
                      formData.append('versions', JSON.stringify(items.reduce((acc, it) => {
                        if (selectedItems.has(it.id)) acc[it.id] = it.version;
                        return acc;
                      }, {} as Record<number, number>)));
                      bulkFetcher.submit(formData, { method: 'post' });
                      setSelectedItems(new Set());
                    }}
                  >
                    86 All
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Delete ${selectedItems.size} items?`)) {
                        const formData = new FormData();
                        formData.append('intent', 'bulk-delete');
                        formData.append('itemIds', JSON.stringify(Array.from(selectedItems)));
                        bulkFetcher.submit(formData, { method: 'post' });
                        setSelectedItems(new Set());
                      }
                    }}
                  >
                    Delete All
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedItems);
                        if (e.target.checked) {
                          newSelected.add(item.id);
                        } else {
                          newSelected.delete(item.id);
                        }
                        setSelectedItems(newSelected);
                      }}
                      className="h-4 w-4 rounded"
                    />
                    <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{item.name}</h3>
                      {!item.isAvailable && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
                          86'd
                        </span>
                      )}
                      {item.dietaryTags && item.dietaryTagsVerified && (
                        <span className="text-xs text-gray-500">{item.dietaryTags}</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                    )}
                    <p className="mt-2 font-semibold">${item.price.toFixed(2)}</p>
                  </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditItem(item)}>
                      Edit
                    </Button>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="toggle-availability" />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="version" value={item.version} />
                      <Button
                        type="submit"
                        variant={item.isAvailable ? 'outline' : 'default'}
                        size="sm"
                      >
                        {item.isAvailable ? '86' : 'Enable'}
                      </Button>
                    </fetcher.Form>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmDelete({ type: 'item', id: item.id })}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {categoryItems.length === 0 && selectedCategory && (
                <p className="text-center text-sm text-muted-foreground">
                  No items in this category. Click "Add Item" to get started.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
