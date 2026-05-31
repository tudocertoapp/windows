import { Linking, Platform } from 'react-native';
import desktopVersion from '../../desktop-version.json';

export const DESKTOP_GITHUB_OWNER = 'tudocertoapp';
export const DESKTOP_GITHUB_REPO = 'windows';
/** Tag fixa usada pelo electron-updater e pelo CI (não confundir com /releases/latest do GitHub). */
export const DESKTOP_RELEASE_TAG = 'latest';

export const DESKTOP_RELEASE_PAGE = `https://github.com/${DESKTOP_GITHUB_OWNER}/${DESKTOP_GITHUB_REPO}/releases/tag/${DESKTOP_RELEASE_TAG}`;

const RELEASE_API_URL = `https://api.github.com/repos/${DESKTOP_GITHUB_OWNER}/${DESKTOP_GITHUB_REPO}/releases/tags/${DESKTOP_RELEASE_TAG}`;

let releaseAssetsCache = null;
let releaseAssetsCacheAt = 0;
const RELEASE_CACHE_MS = 5 * 60 * 1000;

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

function pickReleaseAsset(assets, ext, version) {
  const list = Array.isArray(assets) ? assets : [];
  const preferredName = `Tudo-Certo-Setup-${version}.${ext}`;
  const exact = list.find((a) => a?.name === preferredName);
  if (exact?.browser_download_url) {
    return { url: exact.browser_download_url, fileName: exact.name };
  }
  const candidates = list
    .filter((a) => {
      const name = String(a?.name || '');
      return name.endsWith(`.${ext}`) && /Tudo-Certo-Setup/i.test(name);
    })
    .sort((a, b) => String(b.name).localeCompare(String(a.name)));
  const best = candidates[0];
  if (best?.browser_download_url) {
    return { url: best.browser_download_url, fileName: best.name };
  }
  return null;
}

/** Busca assets reais da release `latest` (evita link 404 quando o ficheiro ainda não existe). */
export async function fetchDesktopReleaseAssets(force = false) {
  const now = Date.now();
  if (!force && releaseAssetsCache && now - releaseAssetsCacheAt < RELEASE_CACHE_MS) {
    return releaseAssetsCache;
  }
  const res = await fetch(RELEASE_API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    throw new Error(`Release ${DESKTOP_RELEASE_TAG} indisponível (${res.status})`);
  }
  const data = await res.json();
  releaseAssetsCache = Array.isArray(data?.assets) ? data.assets : [];
  releaseAssetsCacheAt = now;
  return releaseAssetsCache;
}

/** Resolve URLs de download por plataforma (API + fallback estático). */
export async function resolveDesktopDownloadUrls() {
  const version = getDesktopAppVersion();
  let assets = [];
  try {
    assets = await fetchDesktopReleaseAssets();
  } catch (_) {
    assets = [];
  }

  const fromApi = {
    windows: pickReleaseAsset(assets, 'exe', version),
    mac: pickReleaseAsset(assets, 'dmg', version),
    linux: pickReleaseAsset(assets, 'AppImage', version),
  };

  return {
    windows: fromApi.windows || {
      url: getWindowsSetupDownloadUrl(version),
      fileName: getWindowsSetupFileName(version),
    },
    mac: fromApi.mac || {
      url: getMacSetupDownloadUrl(version),
      fileName: getMacSetupFileName(version),
    },
    linux: fromApi.linux || {
      url: getLinuxSetupDownloadUrl(version),
      fileName: getLinuxSetupFileName(version),
    },
    /** true quando o asset existe na release GitHub (Windows sempre tenta fallback). */
    available: {
      windows: Boolean(fromApi.windows) || assets.length === 0,
      mac: Boolean(fromApi.mac),
      linux: Boolean(fromApi.linux),
    },
  };
}

/** Dispara download no browser ou abre URL no app nativo. */
export function triggerDesktopDownload(url) {
  if (!url) return false;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // GitHub releases: abrir a URL direta inicia o download (.exe / .dmg / .AppImage).
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
  Linking.openURL(url);
  return true;
}
