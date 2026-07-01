export const APP_VERSION = '2026-07-01-pr13';
export const UPDATE_NOTICE = '发现新版本，刷新后继续使用。';
export const UPDATE_BUTTON_LABEL = '刷新到新版本';

export interface AppVersionManifest {
  version: string;
}

export function hasAppVersionMismatch(
  currentVersion: string,
  manifest: Partial<AppVersionManifest> | null,
) {
  return (
    typeof manifest?.version === 'string' &&
    manifest.version.trim().length > 0 &&
    manifest.version !== currentVersion
  );
}

export async function fetchAppVersionManifest(
  fetcher: typeof fetch = fetch,
  cacheBust = Date.now(),
): Promise<AppVersionManifest | null> {
  const response = await fetcher(`/version.json?v=${cacheBust}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }

  const manifest = (await response.json()) as Partial<AppVersionManifest>;
  return typeof manifest.version === 'string' ? { version: manifest.version } : null;
}
