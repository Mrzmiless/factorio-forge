import React, { useEffect, useMemo, useState } from 'react';
import { ipcInvoke, ipcReceive } from '../../lib/ipc';
import { useToast } from '../components/Toast';

export function SettingsPage() {
  const { push } = useToast();
  const [factorioPath, setFactorioPath] = useState('');
  const [factorioOk, setFactorioOk] = useState<boolean | null>(null);
  const [rpcEnabled, setRpcEnabled] = useState<boolean>(false);
  const [updateState, setUpdateState] = useState<any>({ status: 'idle' });
  const [isInstalling, setIsInstalling] = useState(false);
  const [confirmClearData, setConfirmClearData] = useState(false);

  const updateStatusDisplay = useMemo(() => {
    const s = updateState?.status || 'idle';
    if (s === 'dev') return { text: 'Dev mode', variant: 'yellow' as const };
    if (s === 'available' || s === 'error') return { text: s === 'available' ? 'Update available' : 'Error', variant: 'red' as const };
    if (s === 'not-available' || s === 'downloaded') return { text: s === 'downloaded' ? 'Ready to install' : 'Up to date', variant: 'green' as const };
    if (s === 'checking') return { text: 'Checking…', variant: 'muted' as const };
    if (s === 'downloading') return { text: `Downloading… ${Math.round(updateState?.percent ?? 0)}%`, variant: 'muted' as const };
    if (isInstalling) return { text: 'Installing…', variant: 'yellow' as const };
    return { text: 'Idle', variant: 'muted' as const };
  }, [updateState?.status, updateState?.percent, isInstalling]);

  async function refreshFactorio() {
    const validate = await ipcInvoke<{ path: string; exists: boolean }>('validate-factorio-path');
    setFactorioPath(validate?.path ?? '');
    setFactorioOk(!!validate?.exists);
  }

  useEffect(() => {
    refreshFactorio();
    (async () => {
      try {
        const res = await ipcInvoke<{ enabled: boolean }>('get-discord-rpc-enabled');
        setRpcEnabled(!!res?.enabled);
      } catch {}
    })();

    (async () => {
      try {
        const s = await ipcInvoke<any>('updater-get-state');
        if (s) setUpdateState(s);
      } catch {}
    })();

    ipcReceive('updater-state', (s: any) => {
      if (s) setUpdateState(s);
    });
  }, []);

  const badge = useMemo(() => {
    if (factorioOk === null) return { text: 'Checking…', cls: 'badge' };
    if (factorioOk) return { text: 'Factorio found', cls: 'badge ok' };
    return { text: 'Factorio not found', cls: 'badge err' };
  }, [factorioOk]);

  async function chooseExe() {
    const res = await ipcInvoke<any>('choose-factorio-exe');
    if (res?.canceled) return;
    if (res?.error) {
      push(res.error, 'error');
      return;
    }
    push('Factorio path saved.', 'success');
    await refreshFactorio();
  }

  async function savePath() {
    if (!factorioPath.trim()) {
      push('Please set the Factorio executable path.', 'error');
      return;
    }
    await ipcInvoke('set-factorio-path', factorioPath.trim());
    push('Saved.', 'success');
    await refreshFactorio();
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <h1 className="h1">Settings</h1>
      </div>

      <div className="settingsStack">
        <section className="panel">
          <div className="panelHeader">Factorio path</div>
          <div className="panelBody">
            <div className="row">
              <input className="input" value={factorioPath} onChange={e => setFactorioPath(e.target.value)} />
              <button className="btn" onClick={chooseExe}>
                Select
              </button>
            </div>
            <div className="row rowSpace">
              <span className={badge.cls}>{badge.text}</span>
              <button className="btn btnGhost" onClick={savePath}>
                Save
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">Discord RPC</div>
          <div className="panelBody">
            <div className="row">
              <div className="segmented">
                <button
                  className={rpcEnabled ? 'segBtn active' : 'segBtn'}
                  onClick={async () => {
                    const res = await ipcInvoke<any>('set-discord-rpc-enabled', true);
                    if (res?.success) {
                      setRpcEnabled(true);
                      push('Discord RPC enabled.', 'success');
                    }
                  }}
                  type="button"
                >
                  ENABLED
                </button>
                <button
                  className={!rpcEnabled ? 'segBtn active' : 'segBtn'}
                  onClick={async () => {
                    const res = await ipcInvoke<any>('set-discord-rpc-enabled', false);
                    if (res?.success) {
                      setRpcEnabled(false);
                      push('Discord RPC disabled.', 'info');
                    }
                  }}
                  type="button"
                >
                  DISABLED
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">Update</div>
          <div className="panelBody">
            <div className="row rowSpace" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <span className={`updateStatus updateStatus--${updateStatusDisplay.variant}`}>
                {updateStatusDisplay.text}
              </span>
              <div className="row" style={{ gap: 8 }}>
                <button
                  className="btn btnGhost"
                  disabled={updateState?.status === 'checking' || updateState?.status === 'downloading'}
                  onClick={async () => {
                    const s = await ipcInvoke<any>('updater-check');
                    if (s) setUpdateState(s);
                  }}
                >
                  Check
                </button>
                {updateState?.status === 'available' ? (
                  <button
                    className="btn"
                    onClick={async () => {
                      const s = await ipcInvoke<any>('updater-download');
                      if (s) setUpdateState(s);
                    }}
                  >
                    Download
                  </button>
                ) : null}
                {updateState?.status === 'downloaded' ? (
                  <button
                    className="btn"
                    disabled={isInstalling}
                    onClick={async () => {
                      setIsInstalling(true);
                      try {
                        await ipcInvoke<any>('updater-install');
                      } finally {
                        setIsInstalling(false);
                      }
                    }}
                  >
                    Restart & install
                  </button>
                ) : null}
              </div>
            </div>
            {(updateState?.status === 'downloading' || isInstalling) && (
              <div className="updateProgressWrap">
                <div className={`updateProgressBar ${isInstalling ? 'updateProgressBar--indeterminate' : ''}`}>
                  <div
                    className="updateProgressBarFill"
                    style={isInstalling ? {} : { width: `${Math.min(100, updateState?.percent ?? 0)}%` }}
                  />
                </div>
              </div>
            )}
            {updateState?.message && !(updateState?.status === 'downloading' || isInstalling) && (
              <div className="muted" style={{ marginTop: 10 }}>
                {String(updateState.message)}
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">Data & Cache</div>
          <div className="panelBody">
            <div className="row rowSpace">
              <div className="muted">Remove all launcher instances and versions.</div>
              <button
                className="btn btnGhost"
                onClick={async () => {
                  setConfirmClearData(true);
                }}
              >
                Clear data
              </button>
            </div>
            <div className="row rowSpace" style={{ marginTop: 10 }}>
              <div className="muted">Clear logs and cache folders.</div>
              <button
                className="btn btnGhost"
                onClick={async () => {
                  const res = await ipcInvoke<any>('clear-cache');
                  if (res?.error) push(res.error, 'error');
                  else push('Cache cleared.', 'success');
                }}
              >
                Clear cache
              </button>
            </div>
          </div>
        </section>
      </div>

      {confirmClearData && (
        <div className="modalOverlay" onMouseDown={() => setConfirmClearData(false)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">Clear data</div>
            </div>
            <div className="modalBody">
              <p>This will remove all Factorio Forge instances and versions. Continue?</p>
            </div>
            <div className="modalFooter">
              <button className="btn btnGhost" onClick={() => setConfirmClearData(false)}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={async () => {
                  setConfirmClearData(false);
                  const res = await ipcInvoke<any>('clear-data');
                  if (res?.error) push(res.error, 'error');
                  else push('Data cleared.', 'success');
                }}
              >
                Clear data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

