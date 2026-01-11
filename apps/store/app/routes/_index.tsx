import type { MetaFunction } from '@remix-run/cloudflare';

export const meta: MetaFunction = () => {
  return [
    { title: 'Store Dashboard - Diner SaaS' },
    { name: 'description', content: 'Manage your diner with ease' },
  ];
};

export default function Index() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.8' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊 Store Dashboard</h1>
        <p style={{ fontSize: '1.5rem', color: '#666' }}>Phase 1: Foundation Complete</p>
        <p style={{ marginTop: '2rem', color: '#999' }}>
          Tenant management portal coming soon...
        </p>
      </div>
    </div>
  );
}
