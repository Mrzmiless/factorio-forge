import React, { useEffect, useMemo, useState } from 'react';
import { ipcInvoke } from '../../lib/ipc';
import { useToast } from '../components/Toast';

type Instance = { name: string; path: string; version?: string; description?: string };

export function InstancesPage({ onAddNew }: { onAddNew: () => void }) {
  const { push } = useToast();
  const [instances, setInstances] = useState<Instance[] | null>(null);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function reload() {
    const list = await ipcInvoke<Instance[]>('list-instances');
    setInstances(list ?? []);
    const urls: Record<string, string> = {};
    for (const inst of list ?? []) {
      const dataUrl = await ipcInvoke<string | null>('get-instance-cover-data-url', inst.name);
      if (dataUrl) urls[inst.name] = dataUrl;
    }
    setCoverUrls(urls);
  }

  useEffect(() => {
    reload();
    const onChanged = () => reload();
    window.addEventListener('instances-changed', onChanged);
    return () => window.removeEventListener('instances-changed', onChanged);
  }, []);

  const cards = useMemo(() => instances ?? [], [instances]);

  async function start(name: string) {
    const res = await ipcInvoke<any>('launch-instance', name);
    if (res?.error) push(res.error, 'error');
  }

  async function openFolder(name: string) {
    await ipcInvoke('open-instance-folder', name);
  }

  async function rename(name: string) {
    const newName = prompt('New name', name);
    if (!newName || newName.trim() === name) return;
    const res = await ipcInvoke<any>('rename-instance', name, newName.trim());
    if (res?.error) push(res.error, 'error');
    await reload();
    push('Instance renamed.', 'success');
  }

  async function remove(name: string) {
    setConfirmDelete(name);
  }

  async function exportInstance(name: string) {
    const res = await ipcInvoke<any>('export-instance', name);
    if (res?.canceled) return;
    if (res?.error) push(res.error, 'error');
    else push('Instance exported successfully.', 'success');
  }

  async function importInstance() {
    const res = await ipcInvoke<any>('import-instance');
    if (res?.canceled) return;
    if (res?.error) push(res.error, 'error');
    else {
      push(`Instance "${res.name}" imported successfully.`, 'success');
      window.dispatchEvent(new Event('instances-changed'));
      reload();
    }
  }

  async function setCover(name: string) {
    const res = await ipcInvoke<any>('set-instance-cover', name);
    if (res?.canceled) return;
    if (res?.error) push(res.error, 'error');
    else {
      push('Cover updated.', 'success');
      reload();
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <h1 className="h1">Instances</h1>
        <button className="btn btnGhost" onClick={importInstance}>
          Import pack
        </button>
      </div>

      {instances === null ? (
        <div className="empty">Loading…</div>
      ) : cards.length === 0 ? (
        <div className="emptyCard">
          <div className="emptyTitle">No instances yet</div>
          <div className="emptyText">Create a new instance to start playing in an isolated environment.</div>
          <button className="btn" onClick={onAddNew}>
            Add new
          </button>
        </div>
      ) : (
        <div className="grid">
          {cards.map(inst => (
            <div key={inst.name} className="instanceCard">
              <div
                className="instanceCover"
                style={{
                  backgroundImage: coverUrls[inst.name]
                    ? `linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%), url(\"${coverUrls[inst.name]}\")`
                    : `linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%), url('images/defualt banner.png')`
                }}
              />
              <div className="instanceBody">
                <div className="instanceTitle">
                  {inst.name === 'steam-default' ? 'Steam Default' : inst.name === 'vanilla' ? 'Vanilla' : inst.name}
                </div>
                <div className="instanceSub">{inst.version ? `Version: ${inst.version}` : 'Vanilla / custom'}</div>
                <div className="pillRow">
                  <span className="pill">Mods</span>
                  <span className="pill">Saves</span>
                </div>
              </div>
              <div className="instanceActions">
                <button className="btn btnGreen" onClick={() => start(inst.name)}>
                  Start ▷
                </button>
                <div className="actionRow">
                  <button className="btn btnSmall" onClick={() => remove(inst.name)}>
                    Remove
                  </button>
                  <button className="btn btnSmall" onClick={() => openFolder(inst.name)}>
                    Open folder
                  </button>
                  <button
                    className="btnSmall moreBtn"
                    onClick={() => setMenuFor(menuFor === inst.name ? null : inst.name)}
                    aria-label="More actions"
                  >
                    ⋯
                  </button>
                  {menuFor === inst.name && (
                    <div className="instanceMenu">
                      <button className="menuItem" onClick={() => { setCover(inst.name); setMenuFor(null); }}>
                        Cover image
                      </button>
                      <button className="menuItem" onClick={() => { exportInstance(inst.name); setMenuFor(null); }}>
                        Export pack
                      </button>
                      <button className="menuItem" onClick={() => { rename(inst.name); setMenuFor(null); }}>
                        Rename
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="modalOverlay" onMouseDown={() => setConfirmDelete(null)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">Delete instance</div>
            </div>
            <div className="modalBody">
              <p>Delete instance "{confirmDelete}"? This action cannot be undone.</p>
            </div>
            <div className="modalFooter">
              <button className="btn btnGhost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={async () => {
                  const name = confirmDelete;
                  setConfirmDelete(null);
                  const res = await ipcInvoke<any>('delete-instance', name);
                  if (res?.error) push(res.error, 'error');
                  else {
                    await reload();
                    push('Instance removed.', 'success');
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="fab" onClick={onAddNew} aria-label="Add new instance">
        +
      </button>
    </div>
  );
}

