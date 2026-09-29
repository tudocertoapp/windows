import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CatalogoStoreView } from '../components/catalogo/CatalogoStoreView';
import { getApiOrigin } from '../lib/subscription';
import { mergeCatalogoConfig, buildCartWhatsAppMessage, resolveCatalogoItems, getCatalogoPageBg } from '../utils/catalogoStore';
import { getPublicLojaRoute } from '../utils/lojaPublicLink';
import { openWhatsApp } from '../utils/whatsapp';

export function LojaPublicaScreen({ ownerUserId: ownerUserIdProp, lojaSlug: lojaSlugProp }) {
  const { colors } = useTheme();
  const { ref, slug } = useMemo(() => {
    const fromPath = typeof window !== 'undefined' ? getPublicLojaRoute() : null;
    return {
      ref: String(ownerUserIdProp || fromPath?.ownerUserId || '').trim(),
      slug: String(lojaSlugProp || fromPath?.slug || '').trim(),
    };
  }, [ownerUserIdProp, lojaSlugProp]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [store, setStore] = useState(null);
  const [cart, setCart] = useState([]);

  const apiBase = getApiOrigin()
    || (typeof window !== 'undefined' ? String(window.location.origin || '').replace(/\/$/, '') : '');

  useEffect(() => {
    const params = [];
    if (slug) params.push(`slug=${encodeURIComponent(slug)}`);
    if (ref) params.push(`ref=${encodeURIComponent(ref)}`);
    const query = params.join('&');
    if (!query) {
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
        const res = await fetch(`${apiBase}/api/loja/store?${query}&t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json.error || 'Não foi possível carregar a loja.');
          return;
        }
        const config = mergeCatalogoConfig(json.config);
        const products = json.products || [];
        const services = json.services || [];
        const items = (products.length || services.length)
          ? resolveCatalogoItems(config, products, services)
          : (json.items || []);
        setStore({
          profile: json.profile || {},
          config,
          items,
        });
      } catch (_) {
        setError('Erro de conexão. Verifique a internet e tente novamente.');
      } finally {
        setLoading(false);
      }
    })();
  }, [ref, slug, apiBase]);

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

  const ownerUserId = store?.profile?.id || ref;

  const fetchAvailability = useCallback(async (date) => {
    const id = store?.profile?.id || ref;
    const res = await fetch(`${apiBase}/api/loja/availability?ref=${encodeURIComponent(id)}&date=${encodeURIComponent(date)}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Erro ao consultar agenda');
    return { slots: json.slots || [], busy: json.busy || [] };
  }, [apiBase, store?.profile?.id, ref]);

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

  return (
    <SafeAreaView style={[s.root, { backgroundColor: getCatalogoPageBg(store.config).solid || colors.bg }]}>
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
