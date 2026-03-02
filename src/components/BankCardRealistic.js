import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BANDEIRAS = {
  visa: { label: 'VISA', style: 'visa' },
  mastercard: { label: 'Mastercard', style: 'mastercard' },
  elo: { label: 'ELO', style: 'elo' },
};

function ChipSimulado({ cardWidth }) {
  const chipW = cardWidth ? Math.max(28, Math.min(40, cardWidth * 0.105)) : 36;
  const chipH = Math.round(chipW * 0.78);
  const pad = 4;
  return (
    <View style={[chipStyles.wrapper, { width: chipW, height: chipH }]}>
      <LinearGradient colors={['#c9a227', '#d4af37', '#b8860b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={chipStyles.chip}>
        <View style={[chipStyles.line, { top: pad + 2, left: pad + 3, width: 3, height: 2 }]} />
        <View style={[chipStyles.line, { top: pad + 7, left: pad + 3, width: 5, height: 2 }]} />
        <View style={[chipStyles.line, { top: pad + 12, left: pad + 3, width: 4, height: 2 }]} />
        <View style={[chipStyles.line, { top: pad + 17, left: pad + 3, width: 6, height: 2 }]} />
        <View style={[chipStyles.corner, { right: pad + 2, bottom: pad + 2, width: 8, height: 6 }]} />
      </LinearGradient>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrapper: { borderRadius: 4, overflow: 'hidden' },
  chip: {
    flex: 1,
    borderRadius: 4,
    padding: 4,
    position: 'relative',
  },
  line: { position: 'absolute', borderRadius: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  corner: { position: 'absolute', borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' },
});

function BandeiraLogo({ bandeira }) {
  const b = BANDEIRAS[bandeira] || BANDEIRAS.visa;
  if (bandeira === 'mastercard') {
    return (
      <View style={logoStyles.mcWrap}>
        <View style={[logoStyles.mcCircle, logoStyles.mcRed]} />
        <View style={[logoStyles.mcCircle, logoStyles.mcYellow]} />
        <Text style={logoStyles.mcText}>Mastercard</Text>
      </View>
    );
  }
  return <Text style={logoStyles.visa}>{b.label}</Text>;
}

const logoStyles = StyleSheet.create({
  visa: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  mcWrap: { width: 36, height: 24, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  mcCircle: { position: 'absolute', width: 16, height: 16, borderRadius: 8 },
  mcRed: { left: 0, top: 4, backgroundColor: 'rgba(235,0,27,0.95)' },
  mcYellow: { right: 0, top: 4, backgroundColor: 'rgba(245,160,27,0.95)' },
  mcText: { fontSize: 5, fontWeight: '800', color: '#fff', letterSpacing: 0.5, zIndex: 1 },
});

function maskCardNumber(id) {
  const num = String(id || '').replace(/\D/g, '').slice(-4) || '1234';
  return `•••• •••• •••• ${num}`;
}

function getValidThru() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
}

export function BankCardRealistic({
  bank,
  cards,
  profile,
  getBankName,
  formatBankMoney,
  showValues,
  width,
  height,
  dimmed,
  gradientColors,
}) {
  const tipoConta = bank?.tipoConta || 'ambos';
  const temDebito = tipoConta === 'debito' || tipoConta === 'ambos';
  const temCredito = tipoConta === 'credito' || tipoConta === 'ambos';
  const ehAmbos = tipoConta === 'ambos';
  const saldoDebito = temDebito ? (bank?.saldo || 0) : 0;
  const saldoCreditoTotal = cards?.reduce((s, c) => s + (c?.saldo || 0), 0) || 0;
  const bandeiraDebito = bank?.bandeira || 'visa';
  const bandeiraCredito = cards?.[0]?.bandeira || 'visa';
  const bandeira = temDebito ? bandeiraDebito : bandeiraCredito;
  const displayName = (bank?.tipo || 'pessoal') === 'empresa' ? (profile?.empresa || profile?.nome || 'EMPRESA') : (profile?.nome || 'TITULAR DO CARTÃO');
  const mask = (v) => (showValues ? v : '••••••••');

  return (
    <View style={[styles.card, { width, height, opacity: dimmed ? 0.55 : 1 }]}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <View style={[styles.chipPosition, { top: 22, left: 14 }]}>
          <ChipSimulado cardWidth={width} />
        </View>
        <View style={styles.topRow}>
          <View style={{ width: 1, height: 1 }} />
          <BandeiraLogo bandeira={bandeira} />
        </View>

        <Text style={styles.cardNumber}>{showValues ? maskCardNumber(bank?.id) : '•••• •••• •••• ••••'}</Text>
        <View style={styles.nameRow}>
          <Text style={styles.holderName} numberOfLines={1}>{String(displayName).toUpperCase()}</Text>
          <View style={styles.validThruBlock}>
            <Text style={styles.validThruLabel}>VÁL. ATÉ</Text>
            <Text style={styles.validThruDate}>{getValidThru()}</Text>
          </View>
        </View>

        <View style={styles.bankName}>
          <Text style={styles.bankNameText} numberOfLines={1}>{getBankName(bank)}</Text>
        </View>

        {ehAmbos && (
          <View style={styles.balances}>
            {temDebito && (
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>DÉBITO</Text>
                <Text style={styles.balanceValue}>{mask(formatBankMoney(saldoDebito))}</Text>
              </View>
            )}
            {temCredito && cards?.length > 0 && (
              <View style={[styles.balanceRow, temDebito && { marginTop: 4 }]}>
                <Text style={styles.balanceLabel}>CRÉDITO</Text>
                <Text style={styles.balanceValue}>{mask(formatBankMoney(saldoCreditoTotal))}</Text>
                {cards.length > 1 && (
                  <Text style={styles.balanceSub}>{cards.length} cartões</Text>
                )}
              </View>
            )}
          </View>
        )}

        {!ehAmbos && temDebito && (
          <View style={styles.balances}>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>SALDO DISPONÍVEL</Text>
              <Text style={styles.balanceValue}>{mask(formatBankMoney(saldoDebito))}</Text>
            </View>
          </View>
        )}

        {!ehAmbos && temCredito && cards?.length > 0 && (
          <View style={styles.balances}>
            {cards.map((card, i) => (
              <View key={card?.id || i} style={[styles.balanceRow, i > 0 && { marginTop: 4 }]}>
                <Text style={styles.balanceLabel}>{String(card?.name || 'Cartão').toUpperCase()}</Text>
                <Text style={styles.balanceValue}>{mask(formatBankMoney(card?.saldo || 0))}</Text>
                <Text style={styles.balanceSub}>Fech. {card?.diaFechamento || 10} · Venc. {card?.diaVencimento || 15}</Text>
              </View>
            ))}
          </View>
        )}

        {temCredito && cards?.length === 0 && !temDebito && (
          <View style={styles.balances}>
            <Text style={styles.balanceLabel}>Nenhum cartão de crédito</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    position: 'relative',
  },
  chipPosition: {
    position: 'absolute',
    zIndex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  cardNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 2,
    marginTop: 8,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  holderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
    flex: 1,
  },
  validThruBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  validThruLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
  },
  validThruDate: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  bankName: {
    marginTop: 2,
  },
  bankNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  balances: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  balanceRow: {},
  balanceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  balanceSub: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
});
