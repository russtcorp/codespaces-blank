/**
 * MenuSection Component
 * 
 * Displays a category of menu items with empty category hiding logic.
 * As per Master Plan Phase 3:
 * - Hide category if all items are unavailable
 * - Support dietary tags with visual indicators
 * - Show price formatting
 */

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageCfId: string | null;
  isAvailable: boolean;
  dietaryTags: string | null;
  dietaryTagsVerified: boolean;
  isHighlighted: boolean;
}

interface MenuSectionProps {
  category: {
    id: number;
    name: string;
    items: MenuItem[];
  };
  cloudflareImagesUrl?: string;
}

export function MenuSection({ category, cloudflareImagesUrl }: MenuSectionProps) {
  // Empty Category Hiding Logic (Phase 3 Requirement)
  const availableItems = category.items.filter((item) => item.isAvailable);
  
  if (availableItems.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-2xl font-bold text-gray-900 print:text-xl">
        {category.name}
      </h2>
      
      <div className="grid gap-6 md:grid-cols-2 print:grid-cols-2 print:gap-4">
        {availableItems.map((item) => (
          <MenuItem
            key={item.id}
            item={item}
            cloudflareImagesUrl={cloudflareImagesUrl}
          />
        ))}
      </div>
    </section>
  );
}

function MenuItem({ item, cloudflareImagesUrl }: { item: MenuItem; cloudflareImagesUrl?: string }) {
  const dietaryTags = item.dietaryTags ? JSON.parse(item.dietaryTags) : [];
  
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md print:break-inside-avoid print:shadow-none ${item.isHighlighted ? 'ring-2 ring-amber-400' : ''}`}>
      <div className="flex gap-4">
        {/* Image */}
        {item.imageCfId && cloudflareImagesUrl && (
          <div className="flex-shrink-0">
            <img
              src={`${cloudflareImagesUrl}/${item.imageCfId}/thumbnail`}
              alt={item.name}
              className="h-24 w-24 rounded-md object-cover print:hidden"
              loading="lazy"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {item.name}
              {item.isHighlighted && (
                <span className="ml-2 text-xs font-medium text-amber-600 print:hidden">★ Featured</span>
              )}
            </h3>
            <p className="ml-4 text-lg font-bold text-gray-900">
              ${Number(item.price).toFixed(2)}
            </p>
          </div>
          
          {item.description && (
            <p className="mt-2 text-sm text-gray-600 print:text-xs">
              {item.description}
            </p>
          )}
          
          {/* Dietary Tags */}
          {dietaryTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {dietaryTags.map((tag: string) => (
                <span
                  key={tag}
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    item.dietaryTagsVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  } print:bg-gray-200`}
                  title={item.dietaryTagsVerified ? 'Verified by staff' : 'AI-generated suggestion'}
                >
                  {getDietaryTagLabel(tag)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getDietaryTagLabel(tag: string): string {
  const labels: Record<string, string> = {
    GF: 'Gluten-Free',
    V: 'Vegetarian',
    VG: 'Vegan',
    N: 'Contains Nuts',
    D: 'Contains Dairy',
    E: 'Contains Eggs',
    S: 'Spicy',
    H: 'Halal',
    K: 'Kosher',
    SO: 'Contains Soy',
  };
  return labels[tag] || tag;
}
