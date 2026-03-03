import * as fs from 'fs';
import * as path from 'path';

export interface Instance {
  name: string;
  path: string;
  version?: string;
  rootPath?: string;
  description?: string;
  imagePath?: string;
}

export class InstanceManager {
  baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  listInstances(): Instance[] {
    const dirs = fs.readdirSync(this.baseDir, { withFileTypes: true });
    return dirs
      .filter(d => d.isDirectory())
      .map(d => {
        const instPath = path.join(this.baseDir, d.name);
        const jsonPath = path.join(instPath, 'instance.json');
        let meta: Partial<Instance> = { name: d.name, path: instPath };
        if (fs.existsSync(jsonPath)) {
          try {
            const data = fs.readFileSync(jsonPath, 'utf8');
            meta = { ...meta, ...JSON.parse(data) };
          } catch (e) {
            console.error('failed reading instance metadata', e);
          }
        }
        return meta as Instance;
      });
  }

  getInstance(name: string): Instance | null {
    const instPath = path.join(this.baseDir, name);
    if (!fs.existsSync(instPath)) return null;
    const jsonPath = path.join(instPath, 'instance.json');
    let meta: Partial<Instance> = { name, path: instPath };
    if (fs.existsSync(jsonPath)) {
      try {
        meta = { ...meta, ...JSON.parse(fs.readFileSync(jsonPath, 'utf8')) };
      } catch (e) {
        console.error('failed reading instance metadata', e);
      }
    }
    return meta as Instance;
  }

  ensureRootStructure(rootPath: string) {
    if (!fs.existsSync(rootPath)) fs.mkdirSync(rootPath, { recursive: true });
    ['mods', 'saves', 'config'].forEach(sub => {
      const p = path.join(rootPath, sub);
      if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });
  }

  writeInstanceConfig(instPath: string, rootPath: string) {
    const configDir = path.join(instPath, 'config');
    const configFile = path.join(configDir, 'config.ini');
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    const writeDataPath = rootPath.replace(/\\/g, '/');
    const contents = [
      '[path]',
      'use-system-read-write-data-directories=false',
      `write-data=${writeDataPath}`,
      ''
    ].join('\n');
    fs.writeFileSync(configFile, contents);
  }

  writeMetadata(instPath: string, instance: Instance) {
    const metaPath = path.join(instPath, 'instance.json');
    fs.writeFileSync(metaPath, JSON.stringify(instance, null, 2));
  }


  createInstance(name: string, rootPath?: string): Instance {
    const instPath = path.join(this.baseDir, name);
    if (fs.existsSync(instPath)) {
      throw new Error('Instance already exists');
    }
    fs.mkdirSync(instPath, { recursive: true });
    const actualRoot = rootPath && rootPath.trim() ? rootPath : instPath;

    // create subfolders under root path (where Factorio will write)
    this.ensureRootStructure(actualRoot);

    // config.ini lives in the instance folder and points Factorio write-data to root path
    try {
      this.writeInstanceConfig(instPath, actualRoot);
    } catch (e) {
      console.error('failed to create default instance config.ini', e);
    }

    const instance: Instance = { name, path: instPath, rootPath: actualRoot };
    this.writeMetadata(instPath, instance);
    return instance;
  }

  deleteInstance(name: string) {
    const instPath = path.join(this.baseDir, name);
    if (!fs.existsSync(instPath)) {
      throw new Error('Instance does not exist');
    }
    // remove recursively
    fs.rmSync(instPath, { recursive: true, force: true });
    return true;
  }

  renameInstance(oldName: string, newName: string) {
    const oldPath = path.join(this.baseDir, oldName);
    const newPath = path.join(this.baseDir, newName);
    if (!fs.existsSync(oldPath)) {
      throw new Error('Original instance not found');
    }
    if (fs.existsSync(newPath)) {
      throw new Error('New instance name already exists');
    }
    fs.renameSync(oldPath, newPath);
    // update metadata file if exists
    const metaPath = path.join(newPath, 'instance.json');
    if (fs.existsSync(metaPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        data.name = newName;
        fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
      } catch (e) {
        console.error('failed updating metadata during rename', e);
      }
    }
    return { name: newName, path: newPath } as Instance;
  }
}
