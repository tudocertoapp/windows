import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CatalogoStoreView } from '../components/catalogo/CatalogoStoreView';
import { getApiOrigin } from '../lib/subscription';
import { mergeCatalogoConfig, buildCartWhatsAppMessage } from '../utils/catalogoStore';
import { openWhatsApp } from '../utils/whatsapp';

export function LojaPublicaScreen({ ownerUserId: ownerUserIdProp }) {
  const { colors } = useTheme();
  const ownerUserId = useMemo(() => {
    if (ownerUserIdProp) return String(ownerUserIdProp).trim();
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('ref') || '';
    }
    return '';
  }, [ownerUserIdProp]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [store, setStore] = useState(null);
  const [cart, setCart] = useState([]);

  const apiBase = getApiOrigin();

  useEffect(() => {
    if (!ownerUserId) {
      setError('Link da loja inválido. Peça um novo link à empresa.');
      setLoading(false);
      return;
    }
    if (!apiBase) {
      setError('Loja online indisponível no momento.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/loja/store?ref=${encodeURIComponent(ownerUserId)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json.error || 'Não foi possível carregar a loja.');
          return;
        }
        setStore({
          profile: json.profile || {},
          config: mergeCatalogoConfig(json.config),
          items: json.items || [],
        });
      } catch (_) {
        setError('Erro de conexão. Verifique a internet e tente novamente.');
      } finally {
        setLoading(false);
      }
    })();
  }, [ownerUserId, apiBase]);

  const addToCart = (item) => {
    const key = item._rowId || `${item._tipo}:${item.id}`;
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: (next[idx].qty || 1) + 1 };
        return next;
      }
      return [...prev, { key, item, qty: 1 }];
    });
  };

  const updateQty = (key, qty) => {
    if (qty < 1) setCart((prev) => prev.filter((l) => l.key !== key));
    else setCart((prev) => prev.map((l) => (l.key === key ? { ...l, qty } : l)));
  };

  const removeFromCart = (key) => setCart((prev) => prev.filter((l) => l.key !== key));

  const fetchAvailability = useCallback(async (date) => {
    const res = await fetch(`${apiBase}/api/loja/availability?ref=${encodeURIComponent(ownerUserId)}&date=${encodeURIComponent(date)}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Erro ao consultar agenda');
    return { slots: json.slots || [], busy: json.busy || [] };
  }, [apiBase, ownerUserId]);

  const sendWhatsApp = (extras = {}) => {
    const phone = store?.config?.whatsappPedido?.trim() || store?.profile?.telefone;
    if (!phone?.trim()) return;
    const msg = buildCartWhatsAppMessage(cart, store.config, store.profile, extras);
    openWhatsApp(phone, msg);
  };

  const bookOnline = async ({ clientName, clientPhone, clientNotes, schedule, cart: cartLines }) => {
    const payload = {
      ref: ownerUserId,
      clientName,
      clientPhone,
      clientEmail: null,
      clientNotes,
      schedule,
      cart: cartLines.map((line) => ({
        id: line.item.id,
        name: line.item.name,
        price: line.item.price,
        discount: line.item.discount,
        qty: line.qty,
        tipo: line.item._tipo,
      })),
    };
    const res = await fetch(`${apiBase}/api/loja/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Não foi possível agendar.');
    setCart([]);
    return json;
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
        <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 16 }}>Carregando loja...</Text>
      </SafeAreaView>
    );
  }

  if (error || !store) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.bg, justifyContent: 'center', padding: 32 }]}>
        <Ionicons name="storefront-outline" size={64} color={colors.textSecondary} style={{ alignSelf: 'center' }} />
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 16 }}>{error || 'Loja indisponível'}</Text>
      </SafeAreaView>
    );
  }

  const whatsappFab = store.profile?.telefone || store.config?.whatsappPedido;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: store.config.corFundo || colors.bg }]}>
      <CatalogoStoreView
        config={store.config}
        items={store.items}
        profile={store.profile}
        cart={cart}
        onAddToCart={addToCart}
        onUpdateQty={updateQty}
        onRemoveFromCart={removeFromCart}
        onSendWhatsApp={sendWhatsApp}
        onFetchAvailability={store.config.agendamentoOnline !== false ? fetchAvailability : undefined}
        onBookOnline={store.config.agendamentoOnline !== false ? bookOnline : undefined}
        onBookingComplete={() => setCart([])}
        interactive
      />
      {whatsappFab ? (
        <TouchableOpacity
          style={[s.contactFab, { backgroundColor: '#25D366' }]}
          onPress={() => openWhatsApp(whatsappFab, `Olá! Vim pela loja online de ${store.profile?.empresa || store.profile?.nome || 'vocês'}.`)}
        >
          <Ionicons name="logo-whatsapp" size={26} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  contactFab: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
});
