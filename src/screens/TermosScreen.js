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
    text: 'Ao utilizar o aplicativo Tudo Certo, você concorda com estes Termos de Uso. Se não concordar, não utilize o aplicativo. O Tudo Certo é uma ferramenta de gestão financeira, agenda, tarefas, clientes, produtos, serviços e boletos.',
  },
  {
    title: '2. Descrição do Serviço',
    text: 'O Tudo Certo oferece funcionalidades para: controle de receitas e despesas; agenda e eventos; lista de tarefas; gestão de clientes (CRM); cadastro de produtos e serviços; emissão e controle de boletos; fornecedores; gráficos e relatórios. Os recursos disponíveis podem variar conforme o plano contratado (Gratuito, Pessoal + Empresa ou Empresa).',
  },
  {
    title: '3. Cadastro e Conta',
    text: 'Você é responsável por manter a confidencialidade de sua conta e senha. Todas as atividades realizadas em sua conta são de sua responsabilidade. O aplicativo armazena dados localmente no dispositivo e, quando aplicável, em serviços em nuvem vinculados à sua conta.',
  },
  {
    title: '4. Uso Adequado',
    text: 'Você se compromete a utilizar o aplicativo de forma lícita e ética. É proibido: usar o serviço para fins ilegais; manipular ou falsificar dados financeiros; compartilhar credenciais de acesso; utilizar o aplicativo para prejudicar terceiros ou violar leis vigentes.',
  },
  {
    title: '5. Planos e Assinatura',
    text: 'O plano Gratuito oferece recursos básicos. Planos pagos (Pessoal + Empresa, Empresa) desbloqueiam funcionalidades adicionais. A assinatura é opcional e está sujeita aos preços e condições divulgados no aplicativo. O cancelamento pode ser feito a qualquer momento.',
  },
  {
    title: '6. Privacidade e Dados',
    text: 'Seus dados financeiros e cadastrais são tratados de acordo com a Lei Geral de Proteção de Dados (LGPD). Informações sensíveis são armazenadas com segurança. Não vendemos seus dados a terceiros. Consulte nossa Política de Privacidade para mais detalhes.',
  },
  {
    title: '7. Disponibilidade',
    text: 'Nos esforçamos para manter o aplicativo disponível, mas não garantimos funcionamento ininterrupto. Atualizações e manutenções podem causar indisponibilidade temporária. Não nos responsabilizamos por perdas indiretas decorrentes de falhas técnicas.',
  },
  {
    title: '8. Propriedade Intelectual',
    text: 'O aplicativo Tudo Certo, sua marca, interface e conteúdo protegido por direitos autorais são de propriedade dos desenvolvedores. O uso da plataforma não transfere nenhum direito de propriedade intelectual ao usuário.',
  },
  {
    title: '9. Limitação de Responsabilidade',
    text: 'O Tudo Certo é uma ferramenta de apoio à gestão. O usuário é responsável por suas decisões financeiras e pela veracidade dos dados inseridos. O aplicativo não se responsabiliza por decisões tomadas com base nas informações registradas.',
  },
  {
    title: '10. Alterações',
    text: 'Podemos alterar estes Termos a qualquer momento. Alterações significativas serão comunicadas através do aplicativo. O uso continuado após as alterações constitui aceitação dos novos termos.',
  },
  {
    title: '11. Contato',
    text: 'Para dúvidas sobre estes Termos, entre em contato através do suporte disponível no aplicativo ou pelo e-mail de suporte indicado nas configurações.',
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
        <Text style={[ts.update, { color: colors.textSecondary }]}>Última atualização: fevereiro de 2025</Text>
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
