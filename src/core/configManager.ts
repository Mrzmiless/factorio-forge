import * as fs from 'fs';
import * as path from 'path';

export interface Config {
  factorioPath?: string;
  [key: string]: any;
}

export class ConfigManager {
  configPath: string;
  data: Config;

  constructor(baseDir: string) {
    this.configPath = path.join(baseDir, 'config.json');
    if (fs.existsSync(this.configPath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } catch (e) {
        console.error('failed to read config', e);
        this.data = {};
      }
    } else {
      this.data = {};
    }
  }

  get(key: string) {
    return this.data[key];
  }

  set(key: string, value: any) {
    this.data[key] = value;
    this.save();
  }

  save() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('failed to write config', e);
    }
  }
}
