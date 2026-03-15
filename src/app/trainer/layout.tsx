'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from './AuthProvider';

function TrainerNav() {
  const { accessToken, username, logout } = useAuth();
  const pathname = usePathname();

  // Don't show nav on login page
  if (!accessToken || pathname === '/trainer') return null;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/trainer/dashboard" className="text-lg font-semibold text-gray-900">
            Ghost Architect Admin
          </Link>
          <nav className="flex gap-4">
            <Link
              href="/trainer/dashboard"
              className={`text-sm font-medium ${
                pathname.startsWith('/trainer/dashboard')
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{username}</span>
          <button
            onClick={logout}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50" style={{ overflow: 'auto', height: 'auto' }}>
      <AuthProvider>
        <TrainerNav />
        {children}
      </AuthProvider>
    </div>
  );
}
