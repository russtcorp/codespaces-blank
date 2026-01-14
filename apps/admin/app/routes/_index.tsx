import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Diner SaaS - Admin Dashboard" },
    { name: "description", content: "Manage the Diner SaaS fleet" },
  ];
};

export default function Index() {
  const features = [
    {
      title: "Fleet Management",
      description: "View, filter, and manage all tenant accounts",
      link: "/admin/tenants",
      icon: "🏢",
    },
    {
      title: "Tenant Impersonation",
      description: "Log in as a tenant owner for support and debugging",
      link: "/admin/tenants",
      icon: "👤",
    },
    {
      title: "AI Token Monitor",
      description: "Track AI usage (Whisper, Llama) per tenant",
      link: "/admin/ai-monitor",
      icon: "🧠",
    },
    {
      title: "Global Broadcast",
      description: "Send system-wide notifications to all dashboards",
      link: "/admin/broadcast",
      icon: "📢",
    },
    {
      title: "Onboarding Wizard",
      description: "Help tenants set up their site with auto-scraping",
      link: "/admin/onboarding",
      icon: "✨",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            👑 Diner SaaS Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Fleet management and compliance tools for the platform
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-3xl font-bold text-green-600">Phase 6</div>
            <div className="text-sm text-gray-600 mt-2">Polish & Compliance</div>
            <div className="text-xs text-gray-400 mt-1">
              Production-Ready Features
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-3xl font-bold text-blue-600">11</div>
            <div className="text-sm text-gray-600 mt-2">Modules</div>
            <div className="text-xs text-gray-400 mt-1">Fully Implemented</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-3xl font-bold text-purple-600">✅</div>
            <div className="text-sm text-gray-600 mt-2">Compliance</div>
            <div className="text-xs text-gray-400 mt-1">
              A2P 10DLC, WAF, Audit Logs
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {features.map((feature) => (
            <Link
              key={feature.link}
              to={feature.link}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer border border-gray-200 hover:border-blue-400"
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 mt-2">{feature.description}</p>
            </Link>
          ))}
        </div>

        {/* Implementation Details */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
          <h2 className="text-2xl font-bold mb-4">Phase 6 Implementation</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                🔒 Security & Compliance
              </h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>✅ Twilio A2P 10DLC registration interface</li>
                <li>✅ Liability disclaimer footer injection</li>
                <li>✅ WAF Aggregator Shield rules (DoorDash/UberEats)</li>
                <li>✅ R2 audit logging for all mutations</li>
                <li>✅ Immutable compliance records</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                👥 Fleet Management
              </h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>✅ Tenant list with filtering</li>
                <li>✅ "Log In As Owner" impersonation</li>
                <li>✅ Global broadcast system</li>
                <li>✅ Stripe webhook sync</li>
                <li>✅ Support staff audit trail</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                📊 Telemetry & Analytics
              </h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>✅ Cloudflare Web Analytics</li>
                <li>✅ Usage staleness alerts</li>
                <li>✅ AI token usage tracking</li>
                <li>✅ High usage alerts</li>
                <li>✅ Per-tenant breakdown</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                ⚙️ Backend Infrastructure
              </h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>✅ Cron job scheduler</li>
                <li>✅ Stripe webhook handler</li>
                <li>✅ Email queue integration</li>
                <li>✅ D1 audit tables</li>
                <li>✅ KV broadcast system</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
