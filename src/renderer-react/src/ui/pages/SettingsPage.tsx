import React, { useEffect, useMemo, useState } from 'react';
import { ipcInvoke, ipcReceive } from '../../lib/ipc';
import { useToast } from '../components/Toast';

export function SettingsPage() {
  const { push } = useToast();
  const [factorioPath, setFactorioPath] = useState('');
  const [factorioOk, setFactorioOk] = useState<boolean | null>(null);
  const [rpcEnabled, setRpcEnabled] = useState<boolean>(false);
  const [updateState, setUpdateState] = useState<any>({ status: 'idle' });

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
            <div className="row rowSpace">
              <span className="badge">{String(updateState?.status || 'idle')}</span>
              <div className="row" style={{ gap: 8 }}>
                <button
                  className="btn btnGhost"
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
                    onClick={async () => {
                      await ipcInvoke<any>('updater-install');
                    }}
                  >
                    Restart
                  </button>
                ) : null}
              </div>
            </div>
            {updateState?.status === 'downloading' ? (
              <div className="muted" style={{ marginTop: 10 }}>
                Downloading… {Math.round(updateState?.percent || 0)}%
              </div>
            ) : null}
            {updateState?.message ? (
              <div className="muted" style={{ marginTop: 10 }}>
                {String(updateState.message)}
              </div>
            ) : null}
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
                  const ok = window.confirm('This will remove all Factorio Forge instances and versions. Continue?');
                  if (!ok) return;
                  const res = await ipcInvoke<any>('clear-data');
                  if (res?.error) push(res.error, 'error');
                  else push('Data cleared.', 'success');
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
    </div>
  );
}

