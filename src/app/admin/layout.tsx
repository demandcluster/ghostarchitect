import type { ReactNode } from 'react';
import '../globals.css';

export const metadata = {
  title: 'Ghost Architect — Admin',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="breach" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {children}
    </div>
  );
}
