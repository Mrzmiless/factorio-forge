import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import archiver from 'archiver';
import extract from 'extract-zip';
import { InstanceManager } from '../core/instanceManager';
import { ConfigManager } from '../core/configManager';
import * as DiscordRPC from 'discord-rpc';
import { autoUpdater } from 'electron-updater';

console.log('electron main process starting');

const userDataDir = app.getPath('userData');
const logsDir = path.join(userDataDir, 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch {}
}
const logFile = path.join(logsDir, `log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);

function writeLog(level: 'info' | 'error', message: string) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch {}
  if (level === 'error') console.error(line); else console.log(line);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    frame: false, // disable native title bar
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../core/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.setIcon(path.join(__dirname, '../renderer/images/logo.ico'));
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  win.setMenu(null);
  win.center();
  return win;
}

app.whenReady().then(() => {
  app.setName('Factorio Forge');
  writeLog('info', 'app whenReady');
  // ensure base folder structure
  const instancesDir = path.join(app.getPath('userData'), 'instances');
  writeLog('info', `instancesDir: ${instancesDir}`);
  const manager = new InstanceManager(instancesDir);
  // remove earlier automatic creation; use bootstrap function below to create only useful defaults

  // first run: create base instances (vanilla and, if possible, a snapshot from existing Factorio data)
  function bootstrapDefaultInstances() {
    try {
      const existing = manager.listInstances();
      const names = new Set(existing.map(x => x.name));

      // clean instance without mods/saves: "vanilla"
      if (!names.has('vanilla')) {
        try {
          manager.createInstance('vanilla');
        } catch (e) {
          console.error('failed to create vanilla instance', e);
        }
      }

      // instance that reuses current Factorio data (mods/saves/config)
      if (names.has('steam-default')) return;
      const appData = process.env['APPDATA'];
      if (!appData) return;
      const factorioDataDir = path.join(appData, 'Factorio');
      if (!fs.existsSync(factorioDataDir)) return;

      try {
        // create a steam-default instance that copies user's existing Factorio data
        const imported = manager.createInstance('steam-default');
        ['mods', 'saves', 'config'].forEach(sub => {
          const src = path.join(factorioDataDir, sub);
          const dest = path.join(imported.rootPath || imported.path, sub);
          if (fs.existsSync(src)) {
            try {
              fs.cpSync(src, dest, { recursive: true });
            } catch (e) {
              console.error(`failed copying ${sub} from existing Factorio data`, e);
            }
          }
        });
        // update metadata to indicate this is the steam-default snapshot
        try {
          const metaPath = path.join(imported.path, 'instance.json');
          const meta = { name: 'steam-default', path: imported.path, rootPath: imported.rootPath || imported.path, version: 'steam-default' };
          fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
        } catch (e) {
          console.warn('failed to write metadata for steam-default instance', e);
        }
      } catch (e) {
        console.error('failed to create steam-default instance from existing Factorio data', e);
      }
    } catch (e) {
      console.error('failed to bootstrap default instances', e);
    }
  }

  bootstrapDefaultInstances();

  ipcMain.handle('list-instances', () => {
    return manager.listInstances();
  });

  // ---------------- Discord RPC ----------------
  const DISCORD_APP_ID = '1478103028266565632';
  let rpc: DiscordRPC.Client | null = null;
  let rpcReady = false;
  let rpcPlaying = false;

  function isRpcEnabled(): boolean {
    return config.get('discordRpcEnabled') === true;
  }

  async function rpcStart() {
    if (rpc) return;
    rpcReady = false;
    rpcPlaying = false;
    try {
      DiscordRPC.register(DISCORD_APP_ID);
      rpc = new DiscordRPC.Client({ transport: 'ipc' });
      rpc.on('ready', () => {
        rpcReady = true;
        rpcSetBrowsing();
      });
      rpc.on('disconnected', () => {
        rpcReady = false;
      });
      await rpc.login({ clientId: DISCORD_APP_ID });
    } catch (e) {
      console.warn('Discord RPC failed to start', e);
      rpc = null;
      rpcReady = false;
    }
  }

  async function rpcStop() {
    try {
      if (rpc) {
        try {
          await rpc.clearActivity();
        } catch {}
        rpc.destroy();
      }
    } catch {}
    rpc = null;
    rpcReady = false;
    rpcPlaying = false;
  }

  function rpcSetBrowsing(view: string = 'Browsing instances') {
    if (!rpc || !rpcReady) return;
    if (rpcPlaying) return;
    try {
      rpc.setActivity({
        details: 'Factorio Forge',
        state: view,
        instance: false
      });
    } catch {}
  }

  function rpcSetPlaying(instanceName: string) {
    if (!rpc || !rpcReady) return;
    rpcPlaying = true;
    try {
      rpc.setActivity({
        details: 'Playing Factorio',
        state: `Instance: ${instanceName}`,
        instance: true
      });
    } catch {}
  }

  function rpcClearPlaying() {
    rpcPlaying = false;
    rpcSetBrowsing();
  }

  ipcMain.handle('get-discord-rpc-enabled', () => {
    return { enabled: isRpcEnabled() };
  });

  ipcMain.handle('set-discord-rpc-enabled', async (event, enabled: boolean) => {
    config.set('discordRpcEnabled', !!enabled);
    if (enabled) await rpcStart();
    else await rpcStop();
    return { success: true, enabled: !!enabled };
  });

  ipcMain.handle('rpc-set-view', (event, view: string) => {
    if (!isRpcEnabled()) return { success: true };
    rpcSetBrowsing(String(view || 'Browsing'));
    return { success: true };
  });

  ipcMain.handle('choose-folder', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    return { success: true, path: result.filePaths[0] };
  });

  const config = new ConfigManager(app.getPath('userData'));

  // start RPC if enabled
  if (isRpcEnabled()) {
    rpcStart();
  }

  // data / cache maintenance
  ipcMain.handle('clear-data', () => {
    try {
      const versionsDir = path.join(app.getPath('userData'), 'versions');
      if (fs.existsSync(instancesDir)) fs.rmSync(instancesDir, { recursive: true, force: true });
      if (fs.existsSync(versionsDir)) fs.rmSync(versionsDir, { recursive: true, force: true });
      fs.mkdirSync(instancesDir, { recursive: true });
      bootstrapDefaultInstances();
      writeLog('info', 'Launcher data cleared');
      return { success: true };
    } catch (e) {
      writeLog('error', `clear-data error: ${String(e)}`);
      return { error: String(e) };
    }
  });

  ipcMain.handle('clear-cache', () => {
    try {
      const cacheDir = path.join(userDataDir, 'cache');
      if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true, force: true });
      if (fs.existsSync(logsDir)) fs.rmSync(logsDir, { recursive: true, force: true });
      writeLog('info', 'Cache cleared');
      return { success: true };
    } catch (e) {
      writeLog('error', `clear-cache error: ${String(e)}`);
      return { error: String(e) };
    }
  });

  // ---------------- Auto-update ----------------
  type UpdaterStatus =
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error'
    | 'dev';

  let updaterState: {
    status: UpdaterStatus;
    message?: string;
    percent?: number;
    version?: string;
  } = { status: 'idle' };

  function setUpdaterState(next: typeof updaterState, win?: BrowserWindow) {
    updaterState = next;
    try {
      win?.webContents.send('updater-state', updaterState);
    } catch {}
  }

  function initUpdater(win: BrowserWindow) {
    try {
      if (!app.isPackaged) {
        setUpdaterState({ status: 'dev', message: 'Auto-update only runs in packaged builds.' }, win);
        return;
      }
      autoUpdater.allowPrerelease = false;
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;

      autoUpdater.on('checking-for-update', () => setUpdaterState({ status: 'checking' }, win));
      autoUpdater.on('update-available', info =>
        setUpdaterState({ status: 'available', version: (info as any)?.version || undefined }, win)
      );
      autoUpdater.on('update-not-available', () => setUpdaterState({ status: 'not-available' }, win));
      autoUpdater.on('download-progress', p => setUpdaterState({ status: 'downloading', percent: p.percent }, win));
      autoUpdater.on('update-downloaded', info => {
        setUpdaterState({ status: 'downloaded', version: (info as any)?.version || undefined }, win);
        // install immediately without extra confirmation
        try {
          autoUpdater.quitAndInstall();
        } catch (e) {
          setUpdaterState({ status: 'error', message: String(e) }, win);
        }
      });
      autoUpdater.on('error', err => setUpdaterState({ status: 'error', message: String(err) }, win));
      autoUpdater.checkForUpdates().catch(e => {
        setUpdaterState({ status: 'error', message: String(e) }, win);
      });
    } catch (e) {
      setUpdaterState({ status: 'error', message: String(e) }, win);
    }
  }

  ipcMain.handle('updater-get-state', () => updaterState);
  ipcMain.handle('updater-check', async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (e) {
      setUpdaterState({ status: 'error', message: String(e) });
    }
    return updaterState;
  });
  ipcMain.handle('updater-download', async () => {
    try {
      await autoUpdater.downloadUpdate();
    } catch (e) {
      setUpdaterState({ status: 'error', message: String(e) });
    }
    return updaterState;
  });
  ipcMain.handle('updater-install', async () => {
    try {
      autoUpdater.quitAndInstall();
    } catch (e) {
      setUpdaterState({ status: 'error', message: String(e) });
    }
    return { success: true };
  });

  // try to locate factorio.exe in common locations (including some recursion)
  function detectFactorio(): string | undefined {
    const candidates: string[] = [];
    const pf = process.env['PROGRAMFILES'] || 'C:\\Program Files';
    const pfx86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    candidates.push(path.join(pf, 'Factorio', 'bin', 'x64', 'factorio.exe'));
    candidates.push(path.join(pfx86, 'Factorio', 'bin', 'x64', 'factorio.exe'));

    // Steam default location
    candidates.push(path.join(pfx86, 'Steam', 'steamapps', 'common', 'Factorio', 'bin', 'x64', 'factorio.exe'));

    // Steam additional libraries (libraryfolders.vdf)
    try {
      const vdf = path.join(pfx86, 'Steam', 'steamapps', 'libraryfolders.vdf');
      if (fs.existsSync(vdf)) {
        const txt = fs.readFileSync(vdf, 'utf8');
        const libs = new Set<string>();
        // vdf can be in different formats; grab all "path" "X" occurrences
        const re = /\"path\"\s*\"([^\"]+)\"/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(txt))) {
          const p = m[1].replace(/\\\\/g, '\\');
          if (p) libs.add(p);
        }
        for (const lib of libs) {
          candidates.push(path.join(lib, 'steamapps', 'common', 'Factorio', 'bin', 'x64', 'factorio.exe'));
        }
      }
    } catch {}

    // search for folder named Factorio one level down Program Files
    try {
      fs.readdirSync(pf, { withFileTypes: true }).forEach(d => {
        if (d.isDirectory() && d.name.toLowerCase().includes('factorio')) {
          const test = path.join(pf, d.name, 'bin', 'x64', 'factorio.exe');
          candidates.push(test);
        }
      });
    } catch {}

    for (const p of candidates) {
      if (p && fs.existsSync(p)) return p;
    }
    return undefined;
  }

  if (!config.get('factorioPath')) {
    const found = detectFactorio();
    if (found) {
      config.set('factorioPath', found);
      console.log('auto-detected Factorio at', found);
    }
  }

  ipcMain.handle('validate-factorio-path', () => {
    const exe = config.get('factorioPath') || '';
    if (!exe) {
      return { path: '', exists: false };
    }
    const exists = fs.existsSync(exe);
    return { path: exe, exists };
  });

  ipcMain.handle('choose-factorio-exe', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Factorio', extensions: ['exe'] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    const chosen = result.filePaths[0];
    if (!fs.existsSync(chosen)) {
      return { error: 'O ficheiro selecionado não existe mais.' };
    }
    config.set('factorioPath', chosen);
    console.log('Factorio path set by user to', chosen);
    return { success: true, path: chosen };
  });

  ipcMain.handle('create-instance', (event, name: string) => {
    try {
      return manager.createInstance(name);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  });

  // advanced creation: accept options { name, rootPath?, template, importPath? }
  ipcMain.handle('create-instance-advanced', (event, opts: any) => {
    try {
      const name = String(opts.name).trim();
      if (!name) return { error: 'Nome inválido' };

      const template = String(opts.template || 'vanilla');
      const rootPath = opts.rootPath && String(opts.rootPath).trim() ? String(opts.rootPath).trim() : undefined;

      const inst = manager.createInstance(name, rootPath);

      // template population
      if (template === 'clone-steam-default') {
        const src = manager.getInstance('steam-default');
        if (!src?.rootPath) return { error: 'Instância steam-default não encontrada.' };
        try {
          ['mods', 'saves', 'config'].forEach(sub => {
            const from = path.join(src.rootPath as string, sub);
            const to = path.join(inst.rootPath as string, sub);
            if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true });
          });
        } catch (e) {
          console.error('failed cloning steam-default into new instance', e);
          return { error: 'Falha ao clonar steam-default.' };
        }
      } else if (template === 'import-existing') {
        const importPath = opts.importPath && String(opts.importPath).trim() ? String(opts.importPath).trim() : '';
        if (!importPath) return { error: 'Pasta de import inválida.' };
        try {
          ['mods', 'saves', 'config'].forEach(sub => {
            const from = path.join(importPath, sub);
            const to = path.join(inst.rootPath as string, sub);
            if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true });
          });
        } catch (e) {
          console.error('failed importing existing data into new instance', e);
          return { error: 'Falha ao importar dados existentes.' };
        }
      }

      return inst;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  });

  ipcMain.handle('delete-instance', (event, name: string) => {
    try {
      manager.deleteInstance(name);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  });

  ipcMain.handle('rename-instance', (event, oldName: string, newName: string) => {
    try {
      return manager.renameInstance(oldName, newName);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  });

  ipcMain.handle('open-instance-folder', (event, name: string) => {
    const inst = manager.getInstance(name);
    const p = inst?.rootPath || inst?.path || path.join(instancesDir, name);
    shell.openPath(p);
  });

  ipcMain.handle('export-instance', async (event, name: string) => {
    const { dialog } = require('electron');
    const inst = manager.getInstance(name);
    if (!inst) return { error: 'Instance not found.' };
    const root = inst.rootPath || inst.path;
    const result = await dialog.showSaveDialog({
      title: 'Export instance',
      defaultPath: `${name}.ffpack`,
      filters: [{ name: 'Factorio Forge Pack', extensions: ['ffpack'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    try {
      const output = fs.createWriteStream(result.filePath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(output);
      ['mods', 'saves', 'config'].forEach(sub => {
        const p = path.join(root, sub);
        if (fs.existsSync(p)) archive.directory(p, sub);
      });
      const metaPath = path.join(inst.path, 'instance.json');
      let manifest: { name: string; description: string; version: string | null; exportedAt: string } = {
        name: inst.name,
        description: '',
        version: null,
        exportedAt: new Date().toISOString()
      };
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        manifest = { ...manifest, name: meta.name, description: meta.description || '', version: meta.version || null };
      }
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
      const coverPath = path.join(inst.path, 'cover.png');
      if (fs.existsSync(coverPath)) archive.file(coverPath, { name: 'cover.png' });
      return new Promise<any>((resolve, reject) => {
        output.on('close', () => resolve({ success: true, path: result.filePath }));
        archive.on('error', reject);
        archive.finalize();
      });
    } catch (e) {
      writeLog('error', `export-instance error: ${String(e)}`);
      return { error: String(e) };
    }
  });

  ipcMain.handle('import-instance', async (event) => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      title: 'Import instance',
      filters: [{ name: 'Factorio Forge Pack', extensions: ['ffpack', 'zip'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    const zipPath = result.filePaths[0];
    const tempDir = path.join(app.getPath('temp'), `ff-import-${Date.now()}`);
    try {
      fs.mkdirSync(tempDir, { recursive: true });
      await extract(zipPath, { dir: tempDir });
      let manifest: { name: string; description?: string; version?: string } = { name: 'imported' };
      const manifestPath = path.join(tempDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      }
      let baseName = (manifest.name || 'imported').trim() || 'imported';
      let finalName = baseName;
      let i = 1;
      while (fs.existsSync(path.join(instancesDir, finalName))) {
        finalName = `${baseName}-${i++}`;
      }
      const inst = manager.createInstance(finalName);
      const root = inst.rootPath || inst.path;
      ['mods', 'saves', 'config'].forEach(sub => {
        const src = path.join(tempDir, sub);
        const dest = path.join(root, sub);
        if (fs.existsSync(src)) fs.cpSync(src, dest, { recursive: true });
      });
      const coverSrc = path.join(tempDir, 'cover.png');
      if (fs.existsSync(coverSrc)) {
        fs.copyFileSync(coverSrc, path.join(inst.path, 'cover.png'));
      }
      const meta = { ...inst, description: manifest.description, version: manifest.version };
      manager.writeMetadata(inst.path, meta);
      return { success: true, name: finalName };
    } catch (e) {
      writeLog('error', `import-instance error: ${String(e)}`);
      return { error: String(e) };
    } finally {
      try { fs.rmSync(tempDir, { recursive: true }); } catch {}
    }
  });

  ipcMain.handle('set-instance-cover', async (event, name: string) => {
    const { dialog } = require('electron');
    const inst = manager.getInstance(name);
    if (!inst) return { error: 'Instance not found.' };
    const result = await dialog.showOpenDialog({
      title: 'Choose instance cover image',
      filters: [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    try {
      const src = result.filePaths[0];
      const dest = path.join(inst.path, 'cover.png');
      fs.copyFileSync(src, dest);
      return { success: true };
    } catch (e) {
      return { error: String(e) };
    }
  });

  ipcMain.handle('get-instance-cover-data-url', (event, name: string) => {
    const inst = manager.getInstance(name);
    if (!inst) return null;
    const coverPath = path.join(inst.path, 'cover.png');
    if (!fs.existsSync(coverPath)) return null;
    try {
      const buf = fs.readFileSync(coverPath);
      return 'data:image/png;base64,' + buf.toString('base64');
    } catch {
      return null;
    }
  });

  ipcMain.handle('list-versions', () => {
    const versionsDir = path.join(app.getPath('userData'), 'versions');
    if (!fs.existsSync(versionsDir)) return [];
    return fs.readdirSync(versionsDir).filter(d => fs.statSync(path.join(versionsDir, d)).isDirectory());
  });

  ipcMain.handle('import-version', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    const src = result.filePaths[0];
    const versionsDir = path.join(app.getPath('userData'), 'versions');
    if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir, { recursive: true });
    const dest = path.join(versionsDir, path.basename(src));
    try {
      fs.cpSync(src, dest, { recursive: true });
      return { success: true };
    } catch (e) {
      return { error: String(e) };
    }
  });

  ipcMain.handle('get-factorio-path', () => {
    return config.get('factorioPath');
  });

  ipcMain.handle('set-factorio-path', (event, p: string) => {
    config.set('factorioPath', p);
    return { success: true };
  });

  ipcMain.handle('launch-instance', (event, name: string) => {
    try {
      const inst = manager.getInstance(name);
      const instPath = inst?.path || path.join(instancesDir, name);
      const rootPath = inst?.rootPath || instPath;
      const exe = config.get('factorioPath') || "";
      if (!exe || !fs.existsSync(exe)) {
        return { error: 'Factorio executable not found. Configure the path in Settings.' };
      }
      const configDir = path.join(instPath, 'config');
      const configFile = path.join(configDir, 'config.ini');

      // garantir que existe um config.ini válido que aponta write-data para a pasta da instância
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      if (!fs.existsSync(configFile)) {
        try {
          const writeDataPath = rootPath.replace(/\\/g, '/');
          const contents = [
            '[path]',
            'use-system-read-write-data-directories=false',
            `write-data=${writeDataPath}`,
            ''
          ].join('\n');
          fs.writeFileSync(configFile, contents);
        } catch (e) {
          console.error('failed to create config.ini for instance', e);
        }
      }

      const proc = spawn(exe, [
        `--config`, configFile
      ], { detached: false, stdio: 'ignore' });

      if (isRpcEnabled()) {
        rpcSetPlaying(name);
        proc.on('exit', () => {
          rpcClearPlaying();
        });
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  });

  // window control handlers
  ipcMain.handle('window-minimize', event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });
  ipcMain.handle('window-maximize', event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) win.unmaximize(); else win?.maximize();
  });
  ipcMain.handle('window-close', event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  const win = createWindow();
  initUpdater(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});