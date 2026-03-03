import React, { useEffect, useMemo, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { InstancesPage } from './pages/InstancesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ToastHost, ToastProvider } from './components/Toast';
import { CreateInstanceModal } from './components/CreateInstanceModal';
import { ipcInvoke } from '../lib/ipc';

type Page = 'instances' | 'settings';

export function App() {
  const [page, setPage] = useState<Page>('instances');
  const [createOpen, setCreateOpen] = useState(false);

  const sidebarItems = useMemo(
    () => [
      { id: 'instances' as const, label: 'Instances', icon: 'grid' as const },
      { id: 'settings' as const, label: 'Settings', icon: 'cog' as const }
    ],
    []
  );

  useEffect(() => {
    const view = page === 'instances' ? 'Browsing instances' : 'Settings';
    ipcInvoke('rpc-set-view', view).catch(() => {});
  }, [page]);

  return (
    <ToastProvider>
      <div className="appRoot">
        <TitleBar title="Factorio Forge" />
        <div className="shell">
          <Sidebar items={sidebarItems} active={page} onSelect={setPage} />
          <main className="main">
            {page === 'instances' ? (
              <InstancesPage onAddNew={() => setCreateOpen(true)} />
            ) : (
              <SettingsPage />
            )}
          </main>
        </div>
        <ToastHost />

        <CreateInstanceModal open={createOpen} onClose={() => setCreateOpen(false)} />
      </div>
    </ToastProvider>
  );
}

