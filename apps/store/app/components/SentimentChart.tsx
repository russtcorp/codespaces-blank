import { Card } from "@diner-saas/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const processDataForChart = (data: { date: string; sentiment: 'positive' | 'neutral' | 'negative'; count: number }[]) => {
  const groupedData = data.reduce((acc, { date, sentiment, count }) => {
    if (!acc[date]) {
      acc[date] = { date, positive: 0, neutral: 0, negative: 0 };
    }
    acc[date][sentiment] = count;
    return acc;
  }, {});
  return Object.values(groupedData);
};

export function SentimentChart({ data }) {
  const chartData = processDataForChart(data);

  return (
    <Card>
      <Card.Header>
        <Card.Title>Review Sentiment Trends</Card.Title>
        <Card.Description>Positive, neutral, and negative reviews over time.</Card.Description>
      </Card.Header>
      <Card.Content className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="positive" stroke="#22c55e" />
            <Line type="monotone" dataKey="neutral" stroke="#f59e0b" />
            <Line type="monotone" dataKey="negative" stroke="#ef4444" />
          </LineChart>
        </ResponsiveContainer>
      </Card.Content>
    </Card>
  );
}
