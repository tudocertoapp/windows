# Tudo Certo - Desktop App Project

Este é o projeto base para compilar e gerar os instaladores do aplicativo desktop "Tudo Certo", que empacota o site `https://tudocerto-web.vercel.app` para Windows, macOS e Linux usando **Electron** e **electron-builder**.

## 🚀 Estrutura do Projeto
- `/src/` - Contém o código fonte do Electron (`main.js` e a página de erro offline `offline.html`).
- `/build/` - Pasta para hospedar os ícones da aplicação (`icon.ico`, `icon.icns`, `icon.png`). *(Nota: Você precisa adicionar os ícones com esses nomes finais para que o build carregue a sua logo).*
- `/.github/workflows/` - Configuração da automação do GitHub Actions.

## 🛠️ Como Instalar e Rodar Localmente

1. Abra o terminal nesta pasta e instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o aplicativo em modo de desenvolvimento para testar se está carregando corretamente:
   ```bash
   npm start
   ```

## 📦 Como Construir (Build) Manualmente

Você pode construir os arquivos finais (`.exe`, `.dmg`, `.AppImage`, `.deb`) manualmente. Os arquivos compilados irão para a pasta `/dist/`.

- **Para o seu sistema atual (Windows, Mac ou Linux):**
  ```bash
  npm run build
  ```
- **Limitar a apenas um sistema operacional:**
  - **Somente Windows:** `npm run build:win` (Gera `.exe`)
  - **Somente macOS:** `npm run build:mac` (Gera `.dmg` - **Só pode ser rodado em um sistema Mac!**)
  - **Somente Linux:** `npm run build:linux` (Gera `.AppImage` e `.deb`)

## ⚙️ Build Automático via GitHub (Multiplataforma) OBRIGATÓRIO

Como você solicitou um processo de build fácil, implementamos **integração e automação com o GitHub Actions**.  
Isso vai ser capaz de compilar o Mac no próprio sistema do GitHub e gerar todas as extensões sem que você precise usar um Mac!

**Passo-a-passo para usar a automação:**
1. Crie um repositório no seu GitHub e envie esta pasta de código para lá.
2. Atualize o arquivo `package.json` na propriedade `build.publish`: mude de `"owner": "SEU-USUARIO-GITHUB"` e `"repo": "SEU-REPOSITORIO"` para os do seu repositório oficial.
3. Caso queira que versões novas abram o processo de auto-update, e também gerem todos os executáveis automaticamente e já publiquem, você deve criar e dar push em uma **Tag de Versão**, assim:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. O GitHub Actions será acionado (você pode ver na aba `Actions` no GitHub). Ele irá construir o projeto simultaneamente no Windows, Linux e macOS (na nuvem deles) e vai automaticamente criar uma aba **Releases** no seu repositório contendo todos os instaladores listos para download.

### Assinatura (Code Signing)
Para remover os alertas do Windows e Mac que "seu app vem de desenvolvedor desconhecido", o arquivo `build.yml` já está preparado e o código todo estruturado.
Acesse o Github (Aba Settings > Secrets) e preencha as chaves da conta da Apple ou Windows, além do certificado. Descomente as linhas especificadas no arquivo `.github/workflows/build.yml`.

## 📎 Botão de Download Inteligente

Na raiz deste projeto você encontra o script `frontend-download-snippet.js`. Copie esse código ou adicione ao Frontend da sua aplicação na Vercel para detectar o sistema operacional do usuário dinamicamente e colocar o botão que vai mandar baixar a `.exe`, `.dmg`, ou Linux respectiva ao computador dele.
