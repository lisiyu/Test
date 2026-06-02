import type { RuntimeData } from './RuntimeTypes';

export class RuntimeStorage {
  private store: RuntimeData = {};

  get(key: string) {
    return this.store[key];
  }

  set(key: string, value: any) {
    this.store[key] = value;
  }
}

export default RuntimeStorage;
