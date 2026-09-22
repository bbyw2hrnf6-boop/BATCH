import { seedState, upgradeCatalog, type InventoryState } from './inventory';
import { stateSchema } from './validation';

const KEY = 'batch.inventory.v1';

export type StoredInventory = {
  state: InventoryState;
  revision: number;
  updatedAt: string | null;
};

export function loadLocalInventory(): StoredInventory {
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return { state: seedState(), revision: 0, updatedAt: null };
  try {
    const record = JSON.parse(raw) as Partial<StoredInventory>;
    const state = upgradeCatalog(stateSchema.parse(record.state));
    return {
      state,
      revision: Number.isInteger(record.revision) ? Number(record.revision) : 0,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null,
    };
  } catch {
    return { state: seedState(), revision: 0, updatedAt: null };
  }
}

export function saveLocalInventory(state: InventoryState, revision: number): StoredInventory {
  const record = { state, revision: revision + 1, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(record));
  return record;
}
