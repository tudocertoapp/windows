import desktopVersion from '../../desktop-version.json';

export const DESKTOP_GITHUB_OWNER = 'tudocertoapp';
export const DESKTOP_GITHUB_REPO = 'windows';
/** Tag fixa usada pelo electron-updater e pelo CI (não confundir com /releases/latest do GitHub). */
export const DESKTOP_RELEASE_TAG = 'latest';

export const DESKTOP_RELEASE_PAGE = `https://github.com/${DESKTOP_GITHUB_OWNER}/${DESKTOP_GITHUB_REPO}/releases/tag/${DESKTOP_RELEASE_TAG}`;

export function getDesktopAppVersion() {
  return String(desktopVersion?.version || '1.0.0').trim() || '1.0.0';
}

export function getWindowsSetupFileName(version = getDesktopAppVersion()) {
  return `Tudo-Certo-Setup-${version}.exe`;
}

export function getMacSetupFileName(version = getDesktopAppVersion()) {
  return `Tudo-Certo-Setup-${version}.dmg`;
}

export function getLinuxSetupFileName(version = getDesktopAppVersion()) {
  return `Tudo-Certo-Setup-${version}.AppImage`;
}

/** URL direta do instalador .exe na release `latest` do GitHub. */
export function getWindowsSetupDownloadUrl(version = getDesktopAppVersion()) {
  const file = getWindowsSetupFileName(version);
  return `https://github.com/${DESKTOP_GITHUB_OWNER}/${DESKTOP_GITHUB_REPO}/releases/download/${DESKTOP_RELEASE_TAG}/${file}`;
}

/** URL direta do instalador .dmg na release `latest` do GitHub. */
export function getMacSetupDownloadUrl(version = getDesktopAppVersion()) {
  const file = getMacSetupFileName(version);
  return `https://github.com/${DESKTOP_GITHUB_OWNER}/${DESKTOP_GITHUB_REPO}/releases/download/${DESKTOP_RELEASE_TAG}/${file}`;
}

/** URL direta do AppImage na release `latest` do GitHub. */
export function getLinuxSetupDownloadUrl(version = getDesktopAppVersion()) {
  const file = getLinuxSetupFileName(version);
  return `https://github.com/${DESKTOP_GITHUB_OWNER}/${DESKTOP_GITHUB_REPO}/releases/download/${DESKTOP_RELEASE_TAG}/${file}`;
}
