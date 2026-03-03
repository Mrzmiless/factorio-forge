import React, { useEffect, useMemo, useState } from 'react';
import { ipcInvoke } from '../../lib/ipc';
import { useToast } from './Toast';

export function CreateInstanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { push } = useToast();
  const [name, setName] = useState('');
  const [locationMode, setLocationMode] = useState<'default' | 'custom'>('default');
  const [rootPath, setRootPath] = useState('');
  const [template, setTemplate] = useState<'vanilla' | 'clone-steam-default' | 'import-existing'>('vanilla');
  const [importPath, setImportPath] = useState('');
  const [askCover, setAskCover] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setLocationMode('default');
    setRootPath('');
    setTemplate('vanilla');
    setImportPath('');
    setAskCover(false);
  }, [open]);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function browseRoot() {
    const res = await ipcInvoke<any>('choose-folder');
    if (res?.canceled) return;
    if (res?.error) {
      push(res.error, 'error');
      return;
    }
    if (res?.path) setRootPath(res.path);
  }

  async function browseImport() {
    const res = await ipcInvoke<any>('choose-folder');
    if (res?.canceled) return;
    if (res?.error) {
      push(res.error, 'error');
      return;
    }
    if (res?.path) setImportPath(res.path);
  }

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const payload = {
      name: trimmed,
      template,
      rootPath: locationMode === 'custom' ? rootPath.trim() : undefined,
      importPath: template === 'import-existing' ? importPath.trim() : undefined
    };

    const res = await ipcInvoke<any>('create-instance-advanced', payload);
    if (res?.error) {
      push(res.error, 'error');
      return;
    }
    push('Instance created successfully.', 'success');
    if (askCover) {
      await ipcInvoke('set-instance-cover', trimmed);
    }
    window.dispatchEvent(new Event('instances-changed'));
    onClose();
  }

  if (!open) return null;

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">Create new instance</div>
          <button className="iconBtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modalBody">
          <label className="field">
            <div className="fieldLabel">Name</div>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="New instance" />
          </label>

          <div style={{ height: 12 }} />

          <div className="fieldLabel">Template</div>
          <div className="radioGrid">
            <label className={template === 'vanilla' ? 'radioCard active' : 'radioCard'}>
              <input
                type="radio"
                checked={template === 'vanilla'}
                onChange={() => setTemplate('vanilla')}
                style={{ display: 'none' }}
              />
              <div className="radioTitle">Vanilla</div>
              <div className="radioText">Empty mods/saves.</div>
            </label>
            <label className={template === 'clone-steam-default' ? 'radioCard active' : 'radioCard'}>
              <input
                type="radio"
                checked={template === 'clone-steam-default'}
                onChange={() => setTemplate('clone-steam-default')}
                style={{ display: 'none' }}
              />
              <div className="radioTitle">Clone steam-default</div>
              <div className="radioText">Copy mods/saves from your default Factorio data.</div>
            </label>
            <label className={template === 'import-existing' ? 'radioCard active' : 'radioCard'}>
              <input
                type="radio"
                checked={template === 'import-existing'}
                onChange={() => setTemplate('import-existing')}
                style={{ display: 'none' }}
              />
              <div className="radioTitle">Import existing</div>
              <div className="radioText">Import from a folder containing mods/saves/config.</div>
            </label>
          </div>

          {template === 'import-existing' ? (
            <>
              <div style={{ height: 12 }} />
              <div className="fieldLabel">Import folder</div>
              <div className="row">
                <input className="input" value={importPath} onChange={e => setImportPath(e.target.value)} placeholder="C:\\..." />
                <button className="btn btnGhost" onClick={browseImport}>
                  Browse
                </button>
              </div>
            </>
          ) : null}

          <div style={{ height: 12 }} />

          <div className="fieldLabel">Location</div>
          <div className="segmented">
            <button
              className={locationMode === 'default' ? 'segBtn active' : 'segBtn'}
              onClick={() => setLocationMode('default')}
              type="button"
            >
              Default
            </button>
            <button
              className={locationMode === 'custom' ? 'segBtn active' : 'segBtn'}
              onClick={() => setLocationMode('custom')}
              type="button"
            >
              Custom
            </button>
          </div>

          {locationMode === 'custom' ? (
            <div className="row" style={{ marginTop: 10 }}>
              <input className="input" value={rootPath} onChange={e => setRootPath(e.target.value)} placeholder="C:\\Instances\\MyPack" />
              <button className="btn btnGhost" onClick={browseRoot}>
                Browse
              </button>
            </div>
          ) : null}

          <div style={{ height: 16 }} />

          <div className="fieldLabel">Cover image (optional)</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)' }}>
            <input
              type="checkbox"
              checked={askCover}
              onChange={e => setAskCover(e.target.checked)}
              style={{ margin: 0 }}
            />
            Ask me to pick a cover image after creating
          </label>
        </div>
        <div className="modalFooter">
          <button className="btn btnGhost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={!canCreate} onClick={create}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

