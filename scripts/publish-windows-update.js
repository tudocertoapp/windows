/**
 * Envia instalador Windows + latest.yml + .blockmap para a release GitHub
 * com tag "latest" em tudocertoapp/windows (URL usada pelo electron-updater).
 *
 * Token (por ordem): variável GH_TOKEN / GITHUB_TOKEN, ficheiro .github-publish-token
 * (uma linha), ou linha GH_TOKEN=… / GITHUB_TOKEN=… no .env na raiz do projeto.
 * Permissão: escrita no repositório tudocertoapp/windows.
 *
 * Pasta dos artefatos: por defeito `release/`. Em CI: defina WINDOWS_RELEASE_DIR
 * com caminho absoluto para a pasta que contém latest.yml + .exe + .blockmap.
 *
 * Uso: node scripts/publish-windows-update.js
 *      node scripts/publish-windows-update.js --dry-run
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');

const OWNER = 'tudocertoapp';
const REPO = 'windows';
const TAG = 'latest';

const ROOT = path.join(__dirname, '..');
const RELEASE_DIR = process.env.WINDOWS_RELEASE_DIR
  ? path.resolve(process.env.WINDOWS_RELEASE_DIR)
  : path.join(ROOT, 'release');

function stripQuotes(s) {
  const v = s.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).trim();
  }
  return v;
}

/** Token sem escrever o valor em logs. */
function loadToken() {
  const fromEnv = (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '').trim();
  if (fromEnv) return fromEnv;

  const tokenFile = path.join(ROOT, '.github-publish-token');
  if (fs.existsSync(tokenFile)) {
    const line = fs.readFileSync(tokenFile, 'utf8').trim().split(/\r?\n/)[0];
    const t = stripQuotes(line || '');
    if (t) return t;
  }

  const envFile = path.join(ROOT, '.env');
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const m = trimmed.match(/^(?:export\s+)?(?:GH_TOKEN|GITHUB_TOKEN)\s*=\s*(.+)$/i);
      if (m) {
        const t = stripQuotes(m[1]);
        if (t) return t;
      }
    }
  }

  return null;
}

function readPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return pkg.version;
}

function findArtifacts(version) {
  const candidates = [
    `Tudo-Certo-Setup-${version}.exe`,
    `Tudo Certo Setup ${version}.exe`,
  ];
  const files = fs.readdirSync(RELEASE_DIR);
  const exeName = candidates.find((n) => files.includes(n));
  if (!exeName) {
    throw new Error(
      `Nenhum instalador encontrado em release/ para a versão ${version}. ` +
        `Esperado um de: ${candidates.join(', ')}. Rode antes: npm run build:win`
    );
  }
  const blockmapName = `${exeName}.blockmap`;
  if (!files.includes(blockmapName)) {
    throw new Error(`Falta ${blockmapName} em release/. Rode antes: npm run build:win`);
  }
  const ymlPath = path.join(RELEASE_DIR, 'latest.yml');
  if (!fs.existsSync(ymlPath)) {
    throw new Error('Falta release/latest.yml. Rode antes: npm run build:win');
  }
  return {
    exe: path.join(RELEASE_DIR, exeName),
    blockmap: path.join(RELEASE_DIR, blockmapName),
    latestYml: ymlPath,
    exeName,
    blockmapName,
  };
}

async function ghFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    json = null;
  }
  if (!res.ok) {
    const msg = json?.message || text || res.statusText;
    throw new Error(`GitHub ${res.status} ${url}: ${msg}`);
  }
  return json;
}

async function listAllReleaseAssets(releaseId, token) {
  const out = [];
  let page = 1;
  const perPage = 100;
  for (;;) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/releases/${releaseId}/assets?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${token}`,
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`GitHub ${res.status} list assets: ${text}`);
    }
    const batch = JSON.parse(text);
    if (!batch.length) break;
    out.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return out;
}

async function deleteAsset(assetId, token) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/releases/assets/${assetId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text();
    throw new Error(`GitHub ${res.status} delete asset ${assetId}: ${t}`);
  }
}

async function uploadReleaseAsset(uploadUrlTemplate, filePath, name, token) {
  const base = uploadUrlTemplate.replace(/\{\?name,label\}$/, '');
  const url = `${base}?name=${encodeURIComponent(name)}`;
  const size = fs.statSync(filePath).size;
  const stream = createReadStream(filePath);
  const res = await fetch(url, {
    method: 'POST',
    duplex: 'half',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(size),
    },
    body: stream,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Upload falhou ${res.status} (${name}): ${text}`);
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const token = loadToken();

  const version = readPackageVersion();
  const art = findArtifacts(version);

  console.log(`Versão package.json: ${version}`);
  console.log('Arquivos:');
  console.log(`  - ${path.basename(art.latestYml)}`);
  console.log(`  - ${art.exeName}`);
  console.log(`  - ${art.blockmapName}`);

  if (!token) {
    if (dryRun) {
      console.log(
        '\n[dry-run] Sem token (env, .github-publish-token ou GH_TOKEN no .env): não foi possível contactar o GitHub.'
      );
      console.log(
        'Para publicar: adicione GH_TOKEN=… ao .env, ou crie .github-publish-token (uma linha), ou: $env:GH_TOKEN = "…"'
      );
      console.log('Depois: npm run publish:windows-update');
      return;
    }
    console.error(
      'Sem token. Use uma destas opções:\n' +
        '  • Variável: $env:GH_TOKEN = "ghp_..."\n' +
        '  • Ficheiro na raiz: .github-publish-token (uma linha, não vai para o git se estiver no .gitignore)\n' +
        '  • Linha no .env: GH_TOKEN=...\n' +
        'Permissão necessária: escrita em tudocertoapp/windows.'
    );
    process.exit(1);
  }

  const release = await ghFetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}`,
    token
  );
  console.log(`Release "${TAG}" id=${release.id} url=${release.html_url}`);

  const namesToReplace = ['latest.yml', art.exeName, art.blockmapName];
  const assets = await listAllReleaseAssets(release.id, token);
  const toDelete = assets.filter((a) => namesToReplace.includes(a.name));

  if (dryRun) {
    console.log(`[dry-run] Removeria ${toDelete.length} asset(s) com mesmo nome.`);
    console.log('[dry-run] Enviaria os 3 ficheiros acima.');
    return;
  }

  const deleteFailures = [];
  for (const a of toDelete) {
    console.log(`A remover asset antigo: ${a.name} (id ${a.id})`);
    try {
      await deleteAsset(a.id, token);
    } catch (e) {
      deleteFailures.push({ name: a.name, msg: e.message || String(e) });
      console.warn(`Aviso: não removido "${a.name}": ${e.message || e}`);
    }
  }
  if (deleteFailures.length) {
    console.warn(
      '\nSe o envio falhar a seguir, o token pode não ter permissão para apagar/substituir assets. ' +
        'Use PAT **classic** com scope **repo**, ou PAT **fine-grained** com **Contents: Read and write** no repo `windows`. ' +
        'Em organizações: autorize o token em **Settings → SSO** do GitHub, se aparecer.\n'
    );
  }

  const uploadUrl = release.upload_url;
  const tryUpload = async (localPath, name) => {
    try {
      await uploadReleaseAsset(uploadUrl, localPath, name, token);
    } catch (e) {
      const msg = e.message || String(e);
      if (/422|already exists|duplicate/i.test(msg)) {
        throw new Error(
          `Não foi possível enviar "${name}" porque já existe na release e não foi apagado antes.\n` +
            `Opções: (1) apagar manualmente este ficheiro em ${release.html_url} (Edit release → ícone do lixo no asset); ` +
            `(2) gerar um PAT com permissão total no repo (ver avisos acima).\n` +
            `Detalhe: ${msg}`
        );
      }
      throw e;
    }
  };

  console.log('A enviar latest.yml...');
  await tryUpload(art.latestYml, 'latest.yml');
  console.log(`A enviar ${art.exeName} (${(fs.statSync(art.exe).size / 1e6).toFixed(1)} MB)...`);
  await tryUpload(art.exe, art.exeName);
  console.log(`A enviar ${art.blockmapName}...`);
  await tryUpload(art.blockmap, art.blockmapName);

  console.log('Concluído. O electron-updater vai ler:');
  console.log(
    `  https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/latest.yml`
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
