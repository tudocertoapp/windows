import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useProfile } from '../../contexts/ProfileContext';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useTheme } from '../../contexts/ThemeContext';
import { OrcamentosScreen } from './OrcamentosScreen';
import { NovoOrcamentoScreen } from './NovoOrcamentoScreen';
import { OrcamentoDetalheScreen } from './OrcamentoDetalheScreen';
import { useFinance } from '../../contexts/FinanceContext';
import { useMenu } from '../../contexts/MenuContext';
import { shareComprovantePdf, buildComprovanteHtml } from '../../utils/comprovantePdf';
import { openWhatsApp } from '../../utils/whatsapp';
import { playTapSound } from '../../utils/sounds';

const VIEW_LIST = 'list';
const VIEW_NEW = 'new';
const VIEW_EDIT = 'edit';
const VIEW_DETAIL = 'detail';

export function OrcamentosMainScreen({ onClose }) {
  const { clients } = useFinance();
  const { colors } = useTheme();
  const { openAddModal } = useMenu();
  const { profile } = useProfile();
  const [view, setView] = useState(VIEW_LIST);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);
  const [postFaturamentoData, setPostFaturamentoData] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleNew = () => {
    playTapSound();
    setSelectedOrcamento(null);
    setView(VIEW_NEW);
  };

  const handleView = (o) => {
    setSelectedOrcamento(o);
    setView(VIEW_DETAIL);
  };

  const handleEdit = (o) => {
    setSelectedOrcamento(o);
    setView(VIEW_EDIT);
  };

  const handleSaved = () => {
    setView(VIEW_LIST);
    setSelectedOrcamento(null);
  };

  const handleBack = () => {
    playTapSound();
    if (view === VIEW_DETAIL || view === VIEW_EDIT) {
      setSelectedOrcamento(null);
      setView(VIEW_LIST);
    } else if (view === VIEW_NEW) {
      setView(VIEW_LIST);
    } else {
      onClose?.();
    }
  };

  const handleFaturar = (o) => {
    const items = (o.items || []).map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price || 0,
      discount: i.discount || 0,
      qty: i.qty || 1,
      isProduct: i.isProduct === true,
      allowDiscount: i.isProduct === true,
    }));
    const total = o.total || 0;
    openAddModal?.('receita', {
      fromOrcamento: {
        orcamentoId: o.id,
        clientId: o.clientId,
        preOrderItems: items,
        amount: total,
        description: items.map((i) => `${i.name} x${i.qty || 1}`).join(', '),
      },
      onFaturamentoSuccess: (data) => setPostFaturamentoData({ ...data, cliente: clients?.find((c) => c.id === o.clientId) }),
    });
    setView(VIEW_LIST);
    setSelectedOrcamento(null);
  };

  const handlePdf = async (o) => {
    const { shareOrcamentoPdf } = await import('../../utils/orcamentoPdf');
    const { useProfile } = await import('../../contexts/ProfileContext');
  };

  if (view === VIEW_NEW || view === VIEW_EDIT) {
    return (
      <NovoOrcamentoScreen
        editingOrcamento={view === VIEW_EDIT ? selectedOrcamento : null}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  if (view === VIEW_DETAIL && selectedOrcamento) {
    return (
      <OrcamentoDetalheScreen
        orcamento={selectedOrcamento}
        cliente={clients?.find((c) => c.id === selectedOrcamento.clientId)}
        onBack={handleBack}
        onEdit={() => handleEdit(selectedOrcamento)}
        onFaturar={() => handleFaturar(selectedOrcamento)}
      />
    );
  }

  const comprovantePayload = postFaturamentoData
    ? {
        numero: `VND-${Date.now().toString().slice(-6)}`,
        data: postFaturamentoData.date || new Date().toISOString().slice(0, 10),
        cliente: postFaturamentoData.cliente,
        items: postFaturamentoData.saleItems || [],
        total: postFaturamentoData.amount || 0,
        formaPagamento: postFaturamentoData.formaPagamento || 'PIX',
      }
    : null;

  const handlePostFaturamentoPrint = async () => {
    if (!comprovantePayload) return;
    setPdfLoading(true);
    try {
      const html = buildComprovanteHtml(comprovantePayload, profile);
      await Print.printAsync({ html });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível imprimir.');
    }
    setPdfLoading(false);
  };
  const handlePostFaturamentoPdf = async () => {
    if (!comprovantePayload) return;
    setPdfLoading(true);
    try {
      await shareComprovantePdf(comprovantePayload, profile);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
    setPdfLoading(false);
  };
  const handlePostFaturamentoWhatsApp = () => {
    if (comprovantePayload?.cliente?.phone) {
      playTapSound();
      openWhatsApp(comprovantePayload.cliente.phone, 'Segue o comprovante da sua compra.');
      handlePostFaturamentoPdf();
    } else {
      Alert.alert('Atenção', 'Cliente não possui telefone cadastrado.');
    }
  };

  return (
    <>
    <OrcamentosScreen
      onClose={onClose}
      onNewOrcamento={handleNew}
      onViewOrcamento={handleView}
      onEditOrcamento={handleEdit}
      onPdfOrcamento={async (o) => {
        try {
          const { shareOrcamentoPdf } = await import('../../utils/orcamentoPdf');
          await shareOrcamentoPdf(o, clients?.find((c) => c.id === o.clientId), profile);
        } catch (e) {
          Alert.alert('Erro', 'Não foi possível gerar o PDF.');
        }
      }}
      onFaturarOrcamento={handleFaturar}
    />
    <Modal visible={!!postFaturamentoData} transparent animationType="fade">
      <View style={modalS.overlay}>
        <View style={[modalS.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[modalS.title, { color: colors.text }]}>Faturamento concluído!</Text>
          <Text style={[modalS.sub, { color: colors.textSecondary }]}>O que deseja fazer agora?</Text>
          <TouchableOpacity onPress={handlePostFaturamentoPrint} disabled={pdfLoading} style={[modalS.btn, { backgroundColor: colors.primaryRgba?.(0.2) }]}>
            <Ionicons name="print-outline" size={22} color={colors.primary} />
            <Text style={[modalS.btnText, { color: colors.primary }]}>Imprimir comprovante</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePostFaturamentoPdf} disabled={pdfLoading} style={[modalS.btn, { backgroundColor: colors.primaryRgba?.(0.2) }]}>
            {pdfLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="document-outline" size={22} color={colors.primary} />}
            <Text style={[modalS.btnText, { color: colors.primary }]}>Gerar PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePostFaturamentoWhatsApp} style={[modalS.btn, { backgroundColor: '#25D36620' }]}>
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            <Text style={[modalS.btnText, { color: '#25D366' }]}>Enviar pelo WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { playTapSound(); setPostFaturamentoData(null); }} style={[modalS.btnClose, { backgroundColor: colors.border }]}>
            <Text style={[modalS.btnCloseText, { color: colors.text }]}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 340, borderRadius: 16, borderWidth: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sub: { fontSize: 14, marginBottom: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 10 },
  btnText: { fontSize: 15, fontWeight: '600' },
  btnClose: { marginTop: 12, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnCloseText: { fontSize: 15, fontWeight: '600' },
});
