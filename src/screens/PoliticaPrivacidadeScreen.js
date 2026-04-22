import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { topBarStyles } from '../components/TopBar';
import { playTapSound } from '../utils/sounds';

const ps = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  update: { fontSize: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  paragraph: { fontSize: 14, lineHeight: 22, marginBottom: 12, textAlign: 'justify' },
});

const PRIVACIDADE_CONTENT = [
  {
    title: '1. Dados que coletamos',
    text: 'Coletamos dados necessários para o funcionamento do app, como e-mail, nome da conta, preferências de tema/plano e informações que você registra (transações, agenda, clientes, produtos, serviços, fornecedores, boletos e anotações).',
  },
  {
    title: '2. Finalidades de uso',
    text: 'Usamos os dados para autenticação, sincronização entre dispositivos, personalização da experiência, geração de relatórios e melhoria do aplicativo. Não usamos seus dados para venda a terceiros.',
  },
  {
    title: '3. Armazenamento e segurança',
    text: 'Os dados podem ser armazenados localmente no dispositivo e em serviços de nuvem vinculados à sua conta (Supabase). Adotamos medidas técnicas e organizacionais para reduzir risco de acesso não autorizado.',
  },
  {
    title: '4. Compartilhamento',
    text: 'Não comercializamos dados pessoais. O compartilhamento ocorre apenas com operadores essenciais para operação do app (como infraestrutura/autenticação), sempre no limite do necessário.',
  },
  {
    title: '5. Cookies e identificadores (Web)',
    text: 'Na versão web, podemos usar armazenamento local e identificadores técnicos para manter sua sessão ativa, lembrar preferências e garantir funcionamento do login.',
  },
  {
    title: '6. Direitos do titular (LGPD)',
    text: 'Você pode solicitar acesso, correção, atualização e exclusão dos seus dados. Parte dessas ações já está disponível no próprio app (perfil, plano e exclusão de conta conforme regras do plano).',
  },
  {
    title: '7. Retenção e exclusão',
    text: 'Mantemos dados enquanto a conta estiver ativa ou pelo tempo necessário para cumprir obrigações legais. Ao excluir a conta, os dados vinculados são removidos conforme regras de banco e legislação aplicável.',
  },
  {
    title: '8. Menores de idade',
    text: 'O aplicativo não é destinado a coleta intencional de dados de menores sem supervisão legal. Se identificar uso indevido, entre em contato para providências.',
  },
  {
    title: '9. Atualizações desta Política',
    text: 'Esta Política pode ser atualizada para refletir mudanças legais, técnicas ou de produto. A versão mais recente ficará disponível no app, com data de atualização.',
  },
  {
    title: '10. Contato',
    text: 'Para assuntos de privacidade e dados pessoais, utilize os canais de suporte informados no aplicativo.',
  },
];

export function PoliticaPrivacidadeScreen({ onClose, isModal }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose && (
        <View style={[topBarStyles.bar, { backgroundColor: colors.bg }]}>
          <Text style={[topBarStyles.title, { color: colors.text }]}>Política de Privacidade</Text>
          <TouchableOpacity
            style={[topBarStyles.menuBtn, { backgroundColor: colors.primaryRgba(0.2) }]}
            onPress={() => { playTapSound(); onClose(); }}
          >
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator contentContainerStyle={ps.content}>
        <Text style={[ps.title, { color: colors.text }]}>Política de Privacidade do Tudo Certo</Text>
        <Text style={[ps.update, { color: colors.textSecondary }]}>Última atualização: abril de 2026</Text>
        {PRIVACIDADE_CONTENT.map((item, i) => (
          <View key={i} style={ps.section}>
            <Text style={[ps.sectionTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[ps.paragraph, { color: colors.textSecondary }]}>{item.text}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
