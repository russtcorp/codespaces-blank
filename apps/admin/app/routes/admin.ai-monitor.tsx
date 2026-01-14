import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { useEffect, useState } from "react";

interface AITokenMetrics {
  tenantId: string;
  businessName: string;
  whisperTokens: number;
  llamaTokens: number;
  totalTokens: number;
  monthlyLimit: number;
  percentageUsed: number;
}

export async function loader({ context }: LoaderFunctionArgs) {
  // This would query KV for token usage metrics per tenant
  // KV keys: ai-tokens:{tenant_id}:monthly, ai-tokens:{tenant_id}:whisper, ai-tokens:{tenant_id}:llama

  const mockMetrics: AITokenMetrics[] = [
    {
      tenantId: "tenant_1",
      businessName: "Joe's Diner",
      whisperTokens: 5000,
      llamaTokens: 10000,
      totalTokens: 15000,
      monthlyLimit: 100000,
      percentageUsed: 15,
    },
    {
      tenantId: "tenant_2",
      businessName: "Maria's Café",
      whisperTokens: 3000,
      llamaTokens: 5500,
      totalTokens: 8500,
      monthlyLimit: 100000,
      percentageUsed: 8.5,
    },
  ];

  return json({ metrics: mockMetrics });
}

export default function AdminAIMonitor() {
  const { metrics } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      revalidator.revalidate();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, revalidator]);

  const totalTokens = metrics.reduce((sum, m) => sum + m.totalTokens, 0);
  const highUsageTenants = metrics.filter((m) => m.percentageUsed > 75);

  return (
    <div className="p-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">AI Token Monitor</h1>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-4 py-2 rounded text-white font-medium ${
            autoRefresh
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-400 hover:bg-gray-500"
          }`}
        >
          {autoRefresh ? "Auto-Refresh: ON" : "Auto-Refresh: OFF"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Total Tokens Used</div>
          <div className="text-3xl font-bold text-blue-800 mt-2">
            {totalTokens.toLocaleString()}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Active Tenants</div>
          <div className="text-3xl font-bold text-green-800 mt-2">
            {metrics.length}
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium">
            High Usage Alerts
          </div>
          <div className="text-3xl font-bold text-red-800 mt-2">
            {highUsageTenants.length}
          </div>
        </div>
      </div>

      {/* High Usage Tenants Alert */}
      {highUsageTenants.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <p className="font-semibold text-yellow-800">
            ⚠️ {highUsageTenants.length} tenant(s) approaching token limit
          </p>
          <ul className="mt-2 text-sm text-yellow-700">
            {highUsageTenants.map((t) => (
              <li key={t.tenantId}>
                {t.businessName}: {t.percentageUsed.toFixed(1)}% of monthly limit
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Token Usage Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Business</th>
              <th className="px-4 py-3 text-right font-semibold">
                Whisper Tokens
              </th>
              <th className="px-4 py-3 text-right font-semibold">
                Llama Tokens
              </th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-left font-semibold">Usage %</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr
                key={metric.tenantId}
                className="border-b hover:bg-gray-50 transition"
              >
                <td className="px-4 py-3 font-medium">{metric.businessName}</td>
                <td className="px-4 py-3 text-right">
                  {metric.whisperTokens.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {metric.llamaTokens.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {metric.totalTokens.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        metric.percentageUsed > 75
                          ? "bg-red-500"
                          : metric.percentageUsed > 50
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${metric.percentageUsed}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">
                    {metric.percentageUsed.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  {metric.percentageUsed > 75 ? (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                      ⚠️ High
                    </span>
                  ) : metric.percentageUsed > 50 ? (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      📊 Moderate
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      ✅ Healthy
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
        <p className="font-semibold mb-2">📊 How to Read This Dashboard</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Whisper Tokens:</strong> Audio transcription (SMS voice messages)
          </li>
          <li>
            <strong>Llama Tokens:</strong> Text generation (menu descriptions, AI manager)
          </li>
          <li>
            <strong>Monthly Limit:</strong> {metrics[0]?.monthlyLimit.toLocaleString()} tokens per tenant
          </li>
          <li>
            <strong>Usage %:</strong> Percentage of monthly allocation consumed
          </li>
        </ul>
      </div>
    </div>
  );
}
