import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { topBarStyles } from '../components/TopBar';
import { playTapSound } from '../utils/sounds';

const ts = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  update: { fontSize: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  paragraph: { fontSize: 14, lineHeight: 22, marginBottom: 12, textAlign: 'justify' },
  list: { marginLeft: 8, marginBottom: 12 },
  listItem: { fontSize: 14, lineHeight: 22, marginBottom: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
});

const TERMOS_CONTENT = [
  {
    title: '1. Aceitação dos Termos',
    text: 'Ao criar conta ou utilizar o Tudo Certo, você concorda com estes Termos de Uso. Se não concordar, interrompa o uso. O app é uma plataforma de apoio para gestão financeira, agenda e rotinas pessoais/empresariais.',
  },
  {
    title: '2. Descrição do Serviço',
    text: 'O aplicativo oferece recursos como: receitas e despesas, agenda e eventos, tarefas, CRM de clientes, cadastro de produtos/serviços, fornecedores, boletos, relatórios e ferramentas auxiliares. Recursos podem variar conforme o plano ativo.',
  },
  {
    title: '3. Cadastro e Conta',
    text: 'Você é responsável por manter credenciais seguras e por todas as ações feitas na sua conta. Informe dados reais e mantenha-os atualizados. O app pode usar armazenamento local e sincronização em nuvem associada ao seu login.',
  },
  {
    title: '4. Uso Adequado',
    text: 'É proibido usar o app para fins ilícitos, fraude, violação de direitos de terceiros, tentativa de acesso indevido ou qualquer ação que comprometa segurança e funcionamento da plataforma.',
  },
  {
    title: '5. Planos e Assinatura',
    text: 'O plano gratuito oferece recursos essenciais. Planos pagos liberam funcionalidades adicionais e podem ser alterados/cancelados pelo usuário, conforme regras exibidas no app. Alterações de preço ou benefícios podem ser feitas com atualização prévia de informações no produto.',
  },
  {
    title: '6. Privacidade e Proteção de Dados',
    text: 'O tratamento de dados pessoais segue a legislação aplicável, incluindo a LGPD. Para detalhes sobre coleta, uso, compartilhamento e direitos do titular, consulte a Política de Privacidade do aplicativo.',
  },
  {
    title: '7. Disponibilidade e Atualizações',
    text: 'Buscamos manter o serviço disponível, mas pode haver indisponibilidades temporárias por manutenção, atualização, falhas de rede ou serviços de terceiros. Funcionalidades podem ser alteradas, evoluídas ou descontinuadas.',
  },
  {
    title: '8. Propriedade Intelectual',
    text: 'Marca, identidade visual, código, layout e conteúdos do Tudo Certo são protegidos por direitos de propriedade intelectual. O uso do app não transfere qualquer titularidade ao usuário.',
  },
  {
    title: '9. Limitação de Responsabilidade',
    text: 'O Tudo Certo é ferramenta de apoio e não substitui consultoria profissional contábil, jurídica ou financeira. Decisões tomadas com base nas informações inseridas são de responsabilidade do usuário.',
  },
  {
    title: '10. Suspensão, Encerramento e Exclusão de Conta',
    text: 'Contas podem ser suspensas em caso de uso indevido, fraude ou violação destes Termos. O usuário pode solicitar exclusão da conta pelo próprio aplicativo, observando as regras do plano e as rotinas técnicas de remoção de dados.',
  },
  {
    title: '11. Alterações destes Termos',
    text: 'Estes Termos podem ser atualizados para refletir mudanças legais, técnicas ou de produto. A continuidade de uso após atualização caracteriza ciência da versão vigente.',
  },
  {
    title: '12. Lei Aplicável e Contato',
    text: 'Este documento é regido pela legislação brasileira. Para dúvidas, solicitações e suporte, utilize os canais de atendimento disponibilizados no aplicativo.',
  },
];

export function TermosScreen({ onClose, isModal }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose && (
        <View style={[topBarStyles.bar, { backgroundColor: colors.bg }]}>
          <Text style={[topBarStyles.title, { color: colors.text }]}>Termos de Uso</Text>
          <TouchableOpacity
            style={[topBarStyles.menuBtn, { backgroundColor: colors.primaryRgba(0.2) }]}
            onPress={() => { playTapSound(); onClose(); }}
          >
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator contentContainerStyle={ts.content}>
        <Text style={[ts.title, { color: colors.text }]}>Termos de Uso do Tudo Certo</Text>
        <Text style={[ts.update, { color: colors.textSecondary }]}>Última atualização: abril de 2026</Text>
        {TERMOS_CONTENT.map((item, i) => (
          <View key={i} style={ts.section}>
            <Text style={[ts.sectionTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[ts.paragraph, { color: colors.textSecondary }]}>{item.text}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
