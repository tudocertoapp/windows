# Como ver o app no Expo Go de longe (remotamente)

## Opção 1: Túnel Expo (mais rápido)

Use o túnel do Expo para gerar um QR que funciona de qualquer rede:

```bash
npx expo start --tunnel
```

Depois escaneie o QR com o app Expo Go no celular. Funciona mesmo se o celular estiver em outra rede/Wi‑Fi.

---

## Opção 2: Colocar no Snack (link permanente)

1. **Criar repositório no GitHub**
   - Acesse https://github.com/new
   - Crie um repositório (ex: `tudo-certo`)

2. **Enviar o projeto para o GitHub**
   ```bash
   cd "c:\Users\Ballcher\Downloads\tudo-certo (1)\tudo-certo"
   git init
   git add .
   git commit -m "Projeto Tudo Certo"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/tudo-certo.git
   git push -u origin main
   ```

3. **Importar no Snack**
   - Acesse https://snack.expo.dev
   - Clique no menu (☰) → **Import from Git repository**
   - Cole o link do repositório: `https://github.com/SEU_USUARIO/tudo-certo`
   - Clique em **Import**

4. **Rodar no celular**
   - No Snack, clique em **Run on device**
   - Escaneie o QR com o Expo Go

⚠️ **Limitações do Snack:** Alguns pacotes como `expo-speech-recognition` e `expo-media-library` podem ter restrições no Snack. Se der erro, use a **Opção 1** (túnel).
