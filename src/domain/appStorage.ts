import { getBrowserStorage, type StorageLike } from './localPersistence';

export const COUPLE_FLOW_STORAGE_PREFIX = 'couple-flow.';

export interface EnumerableStorageLike extends StorageLike {
  length: number;
  key(index: number): string | null;
}

export function clearCoupleFlowStorage(
  storage: EnumerableStorageLike | null = getEnumerableBrowserStorage(),
) {
  if (!storage) {
    return 0;
  }

  const keysToRemove: string[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(COUPLE_FLOW_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
    return keysToRemove.length;
  } catch {
    return 0;
  }
}

function getEnumerableBrowserStorage(): EnumerableStorageLike | null {
  const storage = getBrowserStorage();
  if (
    !storage ||
    !('length' in storage) ||
    typeof (storage as Partial<EnumerableStorageLike>).key !== 'function'
  ) {
    return null;
  }

  return storage as EnumerableStorageLike;
}
