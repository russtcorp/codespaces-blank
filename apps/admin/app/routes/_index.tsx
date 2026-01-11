import type { MetaFunction } from '@remix-run/cloudflare';

export const meta: MetaFunction = () => {
  return [
    { title: 'Super Admin - Diner SaaS' },
    { name: 'description', content: 'God Mode Dashboard' },
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>👑 Super Admin</h1>
        <p style={{ fontSize: '1.5rem' }}>Phase 1: Foundation Complete</p>
        <p style={{ marginTop: '2rem', opacity: 0.9 }}>
          Fleet management &amp; billing control coming soon...
        </p>
      </div>
    </div>
  );
}
