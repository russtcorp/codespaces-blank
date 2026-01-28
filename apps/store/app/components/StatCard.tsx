import { Card } from "@diner-saas/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

export function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <Card.Header className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title className="text-sm font-medium">{title}</Card.Title>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </Card.Content>
    </Card>
  );
}
