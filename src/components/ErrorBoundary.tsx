import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearCoupleFlowStorage } from '../domain/appStorage';

const CLEAR_WARNING =
  '这会删除这台设备上尚未同步的数据。已同步到双人空间的数据不会受影响。';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    return;
  }

  repairAndReload() {
    const confirmed =
      typeof window === 'undefined' || typeof window.confirm !== 'function'
        ? true
        : window.confirm(CLEAR_WARNING);
    if (!confirmed) {
      return;
    }

    clearCoupleFlowStorage();
    reloadPage();
  }

  reloadOnly() {
    reloadPage();
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="grid min-h-screen place-items-center bg-cream px-5 py-10">
        <section className="w-full max-w-sm rounded-md bg-white/85 p-5 text-center shadow-soft">
          <p className="text-2xl font-black text-ink">页面加载出错</p>
          <p className="mt-3 text-sm leading-6 text-ink/62">
            这台设备可能保留了旧版本本机数据，或者同步配置还没更新完成。
          </p>
          <div className="mt-5 grid gap-2">
            <button
              className="h-11 rounded-md bg-coral px-4 text-sm font-bold text-cream"
              type="button"
              onClick={() => this.repairAndReload()}
            >
              修复并重启
            </button>
            <button
              className="h-11 rounded-md bg-cream px-4 text-sm font-bold text-ink/70"
              type="button"
              onClick={() => this.reloadOnly()}
            >
              重新加载
            </button>
          </div>
        </section>
      </main>
    );
  }
}

function reloadPage() {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}
