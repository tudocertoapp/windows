import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { useBudget } from '../contexts/BudgetContext';
import { topBarStyles } from '../components/TopBar';
import { CATEGORIAS_DESPESA } from '../constants/categories';
import { CATEGORY_COLORS } from '../constants/colors';
import { formatCurrency, parseMoney } from '../utils/format';

const os = StyleSheet.create({
  container: { flex: 1 },
  section: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  catIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  catInfo: { flex: 1 },
  catName: { fontSize: 15, fontWeight: '600' },
  catSpent: { fontSize: 13, marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 12 },
  progressFill: { height: '100%', borderRadius: 4 },
  hint: { fontSize: 11, marginTop: 8, color: '#6b7280' },
  emptyCard: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  addLimitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', marginTop: 16 },
});

function getAllExpenseCategories(transactions) {
  const fromCats = new Set();
  CATEGORIAS_DESPESA.forEach((c) => {
    (c.sub || []).forEach((s) => fromCats.add(s));
  });
  fromCats.add('Outros');
  const monthTx = (transactions || []).filter((t) => {
    if (t.type !== 'expense') return false;
    const d = new Date(t.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  monthTx.forEach((t) => {
    if (t.category) fromCats.add(t.category);
  });
  return Array.from(fromCats).sort((a, b) => a.localeCompare(b));
}

function getCategoryIcon(cat) {
  const parent = CATEGORIAS_DESPESA.find((c) => (c.sub || []).includes(cat));
  return parent?.icon || 'ellipsis-horizontal-outline';
}

const PARENT_COLORS = {
  moradia: '#3b82f6',
  alimentacao: '#f59e0b',
  transporte: '#8b5cf6',
  saude: '#10b981',
  educacao: '#f97316',
  lazer: '#ec4899',
  compras: '#06b6d4',
  financeiro: '#6366f1',
  outros_desp: '#6b7280',
};

function getCategoryColor(cat) {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  const parent = CATEGORIAS_DESPESA.find((c) => (c.sub || []).includes(cat));
  return (parent && PARENT_COLORS[parent.id]) || '#6b7280';
}

export function OrcamentoScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { transactions } = useFinance();
  const { limits, setBudgetLimit, getBudgetLimit, removeBudgetLimit } = useBudget();

  const categories = useMemo(() => getAllExpenseCategories(transactions), [transactions]);

  const catData = useMemo(() => {
    const now = new Date();
    const monthTx = (transactions || []).filter((t) => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const spentMap = {};
    monthTx.forEach((t) => {
      const cat = t.category || 'Outros';
      spentMap[cat] = (spentMap[cat] || 0) + t.amount;
    });
    return categories.map((cat) => ({
      category: cat,
      spent: spentMap[cat] || 0,
      limit: getBudgetLimit(cat),
    }));
  }, [transactions, categories, getBudgetLimit]);

  const [editingLimit, setEditingLimit] = useState(null);
  const [inputVal, setInputVal] = useState('');

  const handleSaveLimit = (cat) => {
    const parsed = parseMoney(inputVal);
    setBudgetLimit(cat, parsed);
    setEditingLimit(null);
    setInputVal('');
  };

  const handleEditLimit = (cat, currentLimit) => {
    setEditingLimit(cat);
    setInputVal(currentLimit > 0 ? formatCurrency(currentLimit).replace('R$ ', '').trim() : '');
  };

  const fmt = (v) => formatCurrency(v);
  const withLimit = catData.filter((d) => d.limit != null && d.limit > 0);
  const withoutLimit = catData.filter((d) => !d.limit || d.limit <= 0);
  const totalLimit = withLimit.reduce((s, d) => s + d.limit, 0);
  const totalSpentWithLimit = withLimit.reduce((s, d) => s + d.spent, 0);

  return (
    <SafeAreaView style={[os.container, { backgroundColor: colors.bg }]}>
      <View style={[topBarStyles.bar, { backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <Text style={[topBarStyles.title, { color: colors.text }]}>Meu Orçamento</Text>
        {isModal && (
          <TouchableOpacity onPress={onClose} style={[topBarStyles.menuBtn, { backgroundColor: 'transparent' }]}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={[os.hint, { color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 12 }]}>
            Defina um limite mensal por categoria para controlar seus gastos.
          </Text>

          {withLimit.length > 0 && totalLimit > 0 && (
            <View style={[os.section, { paddingTop: 8 }]}>
              <View style={[os.card, { backgroundColor: (colors.primaryRgba && colors.primaryRgba(0.15)) || colors.primary + '26', borderColor: colors.primary + '40' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[os.catName, { color: colors.textSecondary }]}>Total do orçamento</Text>
                  <Text style={[os.catName, { color: colors.primary, fontWeight: '700' }]}>{fmt(totalLimit)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[os.catSpent, { color: colors.textSecondary }]}>Gasto este mês</Text>
                  <Text style={[os.catSpent, { color: totalSpentWithLimit > totalLimit ? '#ef4444' : colors.text, fontWeight: '600' }]}>{fmt(totalSpentWithLimit)}</Text>
                </View>
                <View style={[os.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      os.progressFill,
                      {
                        width: `${Math.min(100, (totalSpentWithLimit / totalLimit) * 100)}%`,
                        backgroundColor: totalSpentWithLimit > totalLimit ? '#ef4444' : colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}

          {withLimit.length > 0 && (
            <View style={os.section}>
              <Text style={[os.sectionTitle, { color: colors.textSecondary }]}>LIMITES ATIVOS</Text>
              {withLimit.map(({ category, spent, limit }) => {
                const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                const isOver = spent > limit;
                const isEditing = editingLimit === category;
                return (
                  <View key={category} style={[os.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={os.catRow}>
                      <View style={[os.catIcon, { backgroundColor: getCategoryColor(category) + '25' }]}>
                        <AppIcon name={getCategoryIcon(category)} size={20} color={getCategoryColor(category)} />
                      </View>
                      <View style={os.catInfo}>
                        <Text style={[os.catName, { color: colors.text }]}>{category}</Text>
                        <Text style={[os.catSpent, { color: colors.textSecondary }]}>
                          Gastou {fmt(spent)} de {fmt(limit)}
                          {isOver && (
                            <Text style={{ color: '#ef4444', fontWeight: '600' }}> • Acima do limite!</Text>
                          )}
                        </Text>
                      </View>
                      {!isEditing && (
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <TouchableOpacity
                            onPress={() => handleEditLimit(category, limit)}
                            style={{ padding: 8 }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <AppIcon name="pencil-outline" size={20} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => removeBudgetLimit(category)}
                            style={{ padding: 8 }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <AppIcon name="trash-outline" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <View style={[os.progressBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          os.progressFill,
                          {
                            width: `${Math.min(100, pct)}%`,
                            backgroundColor: isOver ? '#ef4444' : getCategoryColor(category),
                          },
                        ]}
                      />
                    </View>
                    {isEditing && (
                      <View style={os.inputRow}>
                        <TextInput
                          style={[os.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                          placeholder="Novo limite (R$)"
                          placeholderTextColor={colors.textSecondary}
                          value={inputVal}
                          onChangeText={setInputVal}
                          keyboardType="decimal-pad"
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() => handleSaveLimit(category)}
                          style={{ padding: 12, borderRadius: 12, backgroundColor: colors.primary }}
                        >
                          <AppIcon name="checkmark" size={22} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => { setEditingLimit(null); setInputVal(''); }}
                          style={{ padding: 12, borderRadius: 12, backgroundColor: colors.border }}
                        >
                          <AppIcon name="close" size={20} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={os.section}>
            <Text style={[os.sectionTitle, { color: colors.textSecondary }]}>
              {withLimit.length > 0 ? 'ADICIONAR OU EDITAR LIMITE' : 'DEFINIR LIMITES POR CATEGORIA'}
            </Text>
            {withoutLimit.map(({ category, spent }) => {
              const isEditing = editingLimit === category;
              return (
                <View key={category} style={[os.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={os.catRow}>
                    <View style={[os.catIcon, { backgroundColor: getCategoryColor(category) + '25' }]}>
                      <AppIcon name={getCategoryIcon(category)} size={20} color={getCategoryColor(category)} />
                    </View>
                    <View style={os.catInfo}>
                      <Text style={[os.catName, { color: colors.text }]}>{category}</Text>
                      {spent > 0 && (
                        <Text style={[os.catSpent, { color: colors.textSecondary }]}>Gastou {fmt(spent)} este mês</Text>
                      )}
                    </View>
                    {!isEditing ? (
                      <TouchableOpacity
                        onPress={() => { setEditingLimit(category); setInputVal(''); }}
                        style={{ padding: 8, borderRadius: 10, backgroundColor: colors.primary + '20' }}
                      >
                        <AppIcon name="add-outline" size={22} color={colors.primary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {isEditing && (
                    <View style={os.inputRow}>
                      <TextInput
                        style={[os.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                        placeholder="Limite mensal (R$)"
                        placeholderTextColor={colors.textSecondary}
                        value={inputVal}
                        onChangeText={setInputVal}
                        keyboardType="decimal-pad"
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={() => handleSaveLimit(category)}
                        style={{ padding: 12, borderRadius: 12, backgroundColor: colors.primary }}
                      >
                        <AppIcon name="checkmark" size={22} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => { setEditingLimit(null); setInputVal(''); }}
                        style={{ padding: 12, borderRadius: 12, backgroundColor: colors.border }}
                      >
                        <AppIcon name="close" size={20} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
