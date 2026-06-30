import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import type { EnumerableStorageLike } from '../domain/appStorage';

class MemoryStorage implements EnumerableStorageLike {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('ErrorBoundary', () => {
  it('renders the Chinese fallback UI', () => {
    const boundary = new ErrorBoundary({ children: 'ok' });
    boundary.state = { hasError: true };

    const rendered = boundary.render();
    const text = JSON.stringify(rendered);

    expect(text).toContain('页面加载出错');
    expect(text).toContain('这台设备可能保留了旧版本本机数据，或者同步配置还没更新完成。');
    expect(text).toContain('修复并重启');
    expect(text).toContain('重新加载');
  });

  it('repair action removes only couple-flow storage keys', () => {
    const storage = new MemoryStorage();
    storage.setItem('couple-flow.local-state.v1', 'local');
    storage.setItem('couple-flow.pair-identity.v1', 'pair');
    storage.setItem('unrelated', 'keep');
    const reload = vi.fn();
    const originalWindow = globalThis.window;

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        confirm: vi.fn(() => true),
        localStorage: storage,
        location: { reload },
      },
    });

    try {
      const boundary = new ErrorBoundary({ children: 'ok' });
      boundary.repairAndReload();

      expect(storage.getItem('couple-flow.local-state.v1')).toBeNull();
      expect(storage.getItem('couple-flow.pair-identity.v1')).toBeNull();
      expect(storage.getItem('unrelated')).toBe('keep');
      expect(reload).toHaveBeenCalledOnce();
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});
