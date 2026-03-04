import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { InstancesPage } from './pages/InstancesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ToastHost, ToastProvider, useToast } from './components/Toast';
import { DialogProvider } from './components/Dialog';
import { CreateInstanceModal } from './components/CreateInstanceModal';
import { ipcInvoke, ipcReceive } from '../lib/ipc';

type Page = 'instances' | 'settings';

function AppInner() {
  const { push } = useToast();
  const [page, setPage] = useState<Page>('instances');
  const [createOpen, setCreateOpen] = useState(false);
  const updateAvailableToastShown = useRef(false);

  useEffect(() => {
    ipcInvoke<{ status?: string }>('updater-get-state').then(s => {
      if (s?.status === 'available' && !updateAvailableToastShown.current) {
        updateAvailableToastShown.current = true;
        push('A new update is available. Go to Settings to download.', 'info');
      }
    });
    ipcReceive('updater-state', (s: { status?: string }) => {
      if (s?.status === 'available' && !updateAvailableToastShown.current) {
        updateAvailableToastShown.current = true;
        push('A new update is available. Go to Settings to download.', 'info');
      }
    });
  }, [push]);

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
    <DialogProvider>
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
    </DialogProvider>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

