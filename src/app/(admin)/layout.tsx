import { requireAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import AIChatPanel from '@/components/AIChatPanel';
import ClientProviders from '@/components/ClientProviders';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <ClientProviders>
      <div className="admin-shell">
        <Sidebar />
        <div className="admin-main">
          <main className="admin-content">{children}</main>
        </div>
        <AIChatPanel />
      </div>
    </ClientProviders>
  );
}
