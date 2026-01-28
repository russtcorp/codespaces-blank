import { Card } from "@diner-saas/ui/card";
import { ThumbsUp, MessageSquare } from "lucide-react";

export function SocialEngagementStats({ data }: { data: { likes?: number; comments?: number } }) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Social Media Engagement</Card.Title>
        <Card.Description>Total likes and comments on synced posts.</Card.Description>
      </Card.Header>
      <Card.Content className="flex justify-around items-center p-6">
        <div className="text-center">
          <ThumbsUp className="h-8 w-8 text-blue-500 mx-auto" />
          <p className="text-2xl font-bold mt-2">{data.likes || 0}</p>
          <p className="text-xs text-gray-500">Total Likes</p>
        </div>
        <div className="text-center">
          <MessageSquare className="h-8 w-8 text-gray-600 mx-auto" />
          <p className="text-2xl font-bold mt-2">{data.comments || 0}</p>
          <p className="text-xs text-gray-500">Total Comments</p>
        </div>
      </Card.Content>
    </Card>
  );
}
