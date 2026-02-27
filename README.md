# Tudo Certo - Controle Financeiro

App mobile (React Native / Expo) para controle financeiro pessoal.

## Estrutura do projeto

```
src/
  constants/     # Cores de categorias, etc.
  contexts/      # ThemeContext, FinanceContext, MenuContext
  components/    # TopBar, CircularMenu, gráficos (PieChart, BarChart, LineChart)
  screens/       # Dashboard, Agenda, Dinheiro, Gráficos, Menu
  navigation/    # AppNavigator (Tab + Modal do Menu)
  utils/         # formatCurrency e helpers
App.js           # Entrada: providers + AppNavigator
```

## Rodar o app

```bash
npm install
npx expo start
```

Use o **Expo Go** no celular (mesma rede Wi‑Fi) e escaneie o QR code.

## Windows: erro "node:sea"

Em algumas versões do Node/Expo no Windows pode aparecer erro ao criar a pasta `.expo/metro/externals/node:sea` (caractere `:` inválido em caminhos).

- **Expo SDK 54**: esse problema costuma estar corrigido. Se ainda aparecer, você pode usar [patch-package](https://github.com/ds300/patch-package) para aplicar um patch no pacote afetado após `npm install`.
- O script `postinstall` já chama `patch-package`; se existir a pasta `patches/` com um patch, ele será aplicado automaticamente.

## Gráficos

Na tela **Gráficos** você encontra:

- **Resumo do mês** – receitas, despesas e saldo
- **Receitas vs Despesas** – barras por mês com filtro 3m / 6m / 12m
- **Evolução do Saldo Mensal** – linha do saldo ao longo dos meses
- **Pizza** – distribuição das despesas por categoria
- **Barras por categoria** – gastos por categoria no mês
