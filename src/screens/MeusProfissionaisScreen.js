import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { playTapSound } from '../utils/sounds';
import { openWhatsApp } from '../utils/whatsapp';
import {
  loadProfissionaisFavoritos,
  addProfissionalFavorito,
  removeProfissionalFavorito,
  fetchProfissionalPreview,
  searchProfissionais,
} from '../utils/profissionaisFavoritos';
import { LojaInAppViewer } from '../components/LojaInAppViewer';

export function MeusProfissionaisScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { user, isGuest } = useAuth();
  const userKey = user?.id || (isGuest ? 'guest' : '');

  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [adding, setAdding] = useState(false);
  const [lojaAberta, setLojaAberta] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const list = await loadProfissionaisFavoritos(userKey);
    setFavoritos(list);
    setLoading(false);
  }, [userKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleAddByInput = async () => {
    const q = search.trim();
    if (!q) return Alert.alert('Buscar', 'Cole o ID, link da loja ou nome do profissional.');
    playTapSound();
    setAdding(true);
    try {
      let prof = null;
      const looksLikeIdOrLink = q.includes('-') || q.includes('ref=') || q.includes('/loja');
      if (looksLikeIdOrLink) {
        prof = await fetchProfissionalPreview(q);
      } else {
        const results = await searchProfissionais(q);
        if (results.length === 1) prof = results[0];
        else if (results.length > 1) {
          setSearchResults(results);
          setAdding(false);
          return;
        } else {
          prof = await fetchProfissionalPreview(q).catch(() => null);
        }
      }
      if (!prof) throw new Error('Nenhum profissional encontrado.');
      const next = await addProfissionalFavorito(userKey, {
        ownerUserId: prof.ownerUserId,
        nome: prof.nome,
        empresa: prof.empresa,
        foto: prof.foto,
        telefone: prof.telefone,
        subtitulo: prof.subtitulo || prof.displayName,
      });
      setFavoritos(next);
      setSearch('');
      setSearchResults([]);
      Alert.alert('Adicionado', `${prof.displayName || prof.empresa || prof.nome} foi salvo em Meus Profissionais.`);
    } catch (e) {
      Alert.alert('Não encontrado', e.message || 'Verifique o ID ou link e tente novamente.');
    }
    setAdding(false);
  };

  const pickSearchResult = async (prof) => {
    playTapSound();
    setAdding(true);
    try {
      const next = await addProfissionalFavorito(userKey, {
        ownerUserId: prof.ownerUserId,
        nome: prof.nome,
        empresa: prof.empresa,
        foto: prof.foto,
        telefone: prof.telefone,
        subtitulo: prof.subtitulo || prof.displayName,
      });
      setFavoritos(next);
      setSearch('');
      setSearchResults([]);
    } catch (_) {}
    setAdding(false);
  };

  const confirmRemove = (prof) => {
    Alert.alert(
      'Remover',
      `Remover ${prof.empresa || prof.nome || 'este profissional'} dos favoritos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const next = await removeProfissionalFavorito(userKey, prof.ownerUserId);
            setFavoritos(next);
          },
        },
      ]
    );
  };

  const openLoja = (prof) => {
    playTapSound();
    setLojaAberta({
      ownerUserId: prof.ownerUserId,
      title: prof.empresa || prof.nome || prof.subtitulo || 'Loja',
    });
  };

  const displayName = (prof) => prof.empresa?.trim() || prof.nome?.trim() || prof.subtitulo || 'Profissional';

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      <View style={[s.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: colors.text }]}>Meus Profissionais</Text>
          <Text style={[s.sub, { color: colors.textSecondary }]}>Lojas favoritas para agendar e comprar</Text>
        </View>
        {isModal && onClose ? (
          <TouchableOpacity onPress={onClose} style={s.iconBtn}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={[s.label, { color: colors.textSecondary }]}>Adicionar profissional ou loja</Text>
        <Text style={[s.hint, { color: colors.textSecondary }]}>
          Cole o ID de cadastro, link da loja ou busque pelo nome da empresa.
        </Text>
        <View style={s.searchRow}>
          <TextInput
            style={[s.input, { flex: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            placeholder="ID, link ou nome..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: colors.primary, opacity: adding ? 0.7 : 1 }]}
            onPress={handleAddByInput}
            disabled={adding}
          >
            {adding ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="add" size={24} color="#fff" />}
          </TouchableOpacity>
        </View>

        {searchResults.length > 0 && (
          <View style={[s.resultsBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[s.resultsTitle, { color: colors.textSecondary }]}>Resultados — toque para adicionar</Text>
            {searchResults.map((r) => (
              <TouchableOpacity key={r.ownerUserId} style={[s.resultRow, { borderBottomColor: colors.border }]} onPress={() => pickSearchResult(r)}>
                {r.foto ? (
                  <Image source={{ uri: r.foto }} style={s.avatar} />
                ) : (
                  <View style={[s.avatarPh, { backgroundColor: colors.primaryRgba?.(0.2) }]}>
                    <Ionicons name="storefront" size={20} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>{r.displayName || r.empresa || r.nome}</Text>
                  {r.subtitulo ? <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{r.subtitulo}</Text> : null}
                </View>
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>SALVOS ({favoritos.length})</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : favoritos.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="heart-outline" size={48} color={colors.textSecondary} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              Nenhum profissional salvo ainda.{'\n'}Adicione pelo ID ou link que a empresa compartilhou.
            </Text>
          </View>
        ) : (
          favoritos.map((prof) => (
            <View key={prof.ownerUserId} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={s.cardMain} onPress={() => openLoja(prof)} activeOpacity={0.85}>
                {prof.foto ? (
                  <Image source={{ uri: prof.foto }} style={s.cardAvatar} />
                ) : (
                  <View style={[s.cardAvatarPh, { backgroundColor: colors.primaryRgba?.(0.2) }]}>
                    <Ionicons name="storefront" size={28} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>{displayName(prof)}</Text>
                  {prof.subtitulo ? <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>{prof.subtitulo}</Text> : null}
                  <Text style={{ fontSize: 11, color: colors.primary, marginTop: 6, fontWeight: '600' }}>Abrir loja · Agendar · Carrinho</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={[s.cardActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={s.actionBtn} onPress={() => openLoja(prof)}>
                  <Ionicons name="bag-outline" size={18} color={colors.primary} />
                  <Text style={[s.actionText, { color: colors.primary }]}>Loja</Text>
                </TouchableOpacity>
                {prof.telefone ? (
                  <TouchableOpacity style={s.actionBtn} onPress={() => { playTapSound(); openWhatsApp(prof.telefone, `Olá! Vim pelo app Tudo Certo.`); }}>
                    <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                    <Text style={[s.actionText, { color: '#25D366' }]}>WhatsApp</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={s.actionBtn} onPress={() => confirmRemove(prof)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={[s.actionText, { color: '#ef4444' }]}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!lojaAberta} animationType="slide" onRequestClose={() => setLojaAberta(null)}>
        {lojaAberta ? (
          <LojaInAppViewer
            ownerUserId={lojaAberta.ownerUserId}
            title={lojaAberta.title}
            onClose={() => setLojaAberta(null)}
            colors={colors}
          />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 2 },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  hint: { fontSize: 13, lineHeight: 20, marginTop: 6, marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  addBtn: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  resultsBox: { borderWidth: 1, borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  resultsTitle: { fontSize: 11, fontWeight: '700', padding: 12, paddingBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPh: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { textAlign: 'center', lineHeight: 22, fontSize: 14 },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cardAvatar: { width: 56, height: 56, borderRadius: 28 },
  cardAvatarPh: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  actionText: { fontSize: 13, fontWeight: '600' },
});
