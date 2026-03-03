type IpcInvoke = (channel: string, ...args: any[]) => Promise<any>;
type IpcReceive = (channel: string, func: (...args: any[]) => void) => void;

declare global {
  interface Window {
    api?: {
      invoke: IpcInvoke;
      receive?: IpcReceive;
      window: { minimize: () => Promise<void>; maximize: () => Promise<void>; close: () => Promise<void> };
    };
  }
}

export function ipcInvoke<T = any>(channel: string, ...args: any[]): Promise<T> {
  if (!window.api?.invoke) {
    return Promise.reject(new Error('IPC bridge not available (preload not loaded).'));
  }
  return window.api.invoke(channel, ...args) as Promise<T>;
}

export function ipcReceive(channel: string, func: (...args: any[]) => void) {
  window.api?.receive?.(channel, func);
}

