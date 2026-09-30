import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/format';
import { getEffectivePrice } from '../../utils/catalogoStore';
import { playTapSound } from '../../utils/sounds';

function itemPhotos(item) {
  if (!item) return [];
  const data = item.data && typeof item.data === 'object' ? item.data : {};
  const raw = data.photo_uris || item.photoUris || item.photos || item.photo_uris;
  const list = Array.isArray(raw) ? raw : [];
  const extras = [item.photoUri, item.photo_uri, item.foto, data.photo_uri];
  const out = [];
  const seen = new Set();
  [...list, ...extras].forEach((entry) => {
    const uri = typeof entry === 'string' ? entry : entry?.uri;
    if (!uri || uri.startsWith('blob:') || uri.startsWith('file:') || seen.has(uri)) return;
    seen.add(uri);
    out.push(uri);
  });
  return out;
}

function itemDescription(item) {
  if (!item) return '';
  const data = item.data && typeof item.data === 'object' ? item.data : {};
  return String(item.description || item.descricao || data.description || data.descricao || '').trim();
}

function itemStock(item) {
  if (!item || item._tipo === 'servico') return null;
  const data = item.data && typeof item.data === 'object' ? item.data : {};
  const n = Number(item.stock ?? data.stock);
  return Number.isFinite(n) ? n : null;
}

export function LojaItemDetailModal({
  visible,
  item,
  config,
  fonts,
  cardBg,
  mostrarEstoque,
  mostrarCarrinho,
  onAddToCart,
  onClose,
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = useMemo(() => itemPhotos(item), [item]);
  useEffect(() => { setPhotoIdx(0); }, [item]);
  const desc = itemDescription(item);
  const stock = itemStock(item);
  const showStock = mostrarEstoque && stock != null;
  const price = Number(item?.price) || 0;
  const effective = item ? getEffectivePrice(item) : 0;
  const temPromo = config?.mostrarPromocao !== false && Number(item?.discount) > 0;

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.bg} onPress={onClose}>
        <Pressable style={[st.sheet, { backgroundColor: cardBg, borderColor: (config?.corPrincipal || '#2563eb') + '33' }]} onPress={(e) => e.stopPropagation()}>
          <View style={st.top}>
            <Text style={[st.title, { color: fonts?.produto || config?.corTexto }]} numberOfLines={2}>{item.name}</Text>
            <TouchableOpacity onPress={() => { playTapSound(); onClose?.(); }} hitSlop={8} style={st.close}>
              <Ionicons name="close" size={20} color={config?.corTexto || '#0f172a'} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {photos.length ? (
              <>
                <Image source={{ uri: photos[photoIdx] || photos[0] }} style={st.hero} resizeMode="cover" />
                {photos.length > 1 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.thumbs}>
                    {photos.map((uri, i) => (
                      <TouchableOpacity
                        key={uri}
                        onPress={() => { playTapSound(); setPhotoIdx(i); }}
                        style={[st.thumbWrap, i === photoIdx && { borderColor: config?.corPrincipal }]}
                      >
                        <Image source={{ uri }} style={st.thumb} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
              </>
            ) : (
              <View style={[st.hero, st.heroPh, { backgroundColor: (config?.corPrincipal || '#2563eb') + '18' }]}>
                <Ionicons name={item._tipo === 'servico' ? 'construct' : 'cube'} size={42} color={config?.corPrincipal} />
              </View>
            )}
            {config?.mostrarPrecos !== false ? (
              <View style={st.priceRow}>
                {temPromo ? <Text style={[st.old, { color: (fonts?.produto || '#64748b') + '88' }]}>{formatCurrency(price)}</Text> : null}
                <Text style={[st.price, { color: fonts?.preco || config?.corPrincipal }]}>{formatCurrency(effective)}</Text>
                {item.unit ? <Text style={[st.unit, { color: fonts?.produto }]}>/ {item.unit}</Text> : null}
              </View>
            ) : null}
            {showStock ? (
              <Text style={[st.stock, { color: stock > 0 ? fonts?.produto : '#ef4444' }]}>
                {stock > 0 ? `${stock} ${item.unit || 'un'} em estoque` : 'Sem estoque'}
              </Text>
            ) : null}
            {desc ? (
              <Text style={[st.desc, { color: fonts?.produto || config?.corTexto }]}>{desc}</Text>
            ) : (
              <Text style={[st.desc, { color: (fonts?.produto || '#64748b') + '99' }]}>
                Sem descrição cadastrada.
              </Text>
            )}
          </ScrollView>
          {mostrarCarrinho ? (
            <TouchableOpacity
              style={[st.add, { backgroundColor: config?.corPrincipal, opacity: showStock && stock <= 0 ? 0.45 : 1 }]}
              disabled={showStock && stock <= 0}
              onPress={() => { playTapSound(); onAddToCart?.(item); onClose?.(); }}
            >
              <Ionicons name="cart-outline" size={18} color="#fff" />
              <Text style={st.addText}>Adicionar ao carrinho</Text>
            </TouchableOpacity>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 16 },
  sheet: { borderRadius: 20, borderWidth: 1, padding: 16, maxHeight: '88%' },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(148,163,184,0.2)' },
  hero: { width: '100%', height: 240, borderRadius: 14, marginBottom: 10 },
  heroPh: { alignItems: 'center', justifyContent: 'center' },
  thumbs: { gap: 8, paddingBottom: 10 },
  thumbWrap: { borderWidth: 2, borderColor: 'transparent', borderRadius: 10, overflow: 'hidden' },
  thumb: { width: 56, height: 56 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  old: { fontSize: 13, textDecorationLine: 'line-through' },
  price: { fontSize: 22, fontWeight: '800' },
  unit: { fontSize: 13, fontWeight: '600' },
  stock: { fontSize: 13, fontWeight: '700', marginTop: 8 },
  desc: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 12, borderRadius: 12 },
  addText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
