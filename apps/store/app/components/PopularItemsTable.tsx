import { Card } from "@diner-saas/ui/card";

export function PopularItemsTable({ data }) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Most Popular Items</Card.Title>
        <Card.Description>Top 10 menu items by customer views.</Card.Description>
      </Card.Header>
      <Card.Content>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Item</th>
              <th className="text-right py-2 font-medium">Views</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.name}</td>
                <td className="text-right py-2">{item.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card.Content>
    </Card>
  );
}
