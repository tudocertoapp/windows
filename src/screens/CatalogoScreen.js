import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { useProfile } from '../contexts/ProfileContext';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playTapSound } from '../utils/sounds';
import { formatCurrency } from '../utils/format';
import { uploadClientPhoto } from '../utils/uploadClientPhoto';

const CATALOGO_CONFIG_KEY = '@tudocerto_catalogo_config';
const { width: SW } = Dimensions.get('window');

const TIPO_OPCOES = [
  { id: 'produtos', label: 'Apenas produtos', icon: 'cube-outline' },
  { id: 'servicos', label: 'Apenas serviços', icon: 'construct-outline' },
  { id: 'ambos', label: 'Produtos e serviços', icon: 'apps-outline' },
];

const LAYOUT_OPCOES = [
  { id: 'carrossel', label: 'Carrossel + grade', icon: 'albums-outline' },
  { id: 'horizontal', label: 'Linha horizontal', icon: 'reorder-two-outline' },
  { id: 'vertical', label: 'Linha vertical', icon: 'list-outline' },
  { id: 'grid', label: 'Grade 3x4', icon: 'grid-outline' },
];

const CATEGORIA_TABS = [
  { id: 'todos', label: 'TODOS' },
  { id: 'produtos', label: 'PRODUTOS' },
  { id: 'servicos', label: 'SERVIÇOS' },
];

const CORES_CATALOGO = ['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#0ea5e9', '#ef4444', '#84cc16'];
const CORES_FUNDO = ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#fef3c7', '#dbeafe', '#fce7f3'];

const DEFAULT_CONFIG = {
  tipo: 'ambos',
  layout: 'carrossel',
  corPrincipal: '#10b981',
  corFundo: '#ffffff',
  titulo: 'Catálogo',
  subtitulo: 'Confira nossos produtos e serviços',
  usaLogo: true,
  usaNomeProfissional: true,
  nomeProfissional: '',
  fotoCatalogo: null,
};

export function CatalogoScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { products, services } = useFinance();
  const { profile } = useProfile();
  const { showEmpresaFeatures } = usePlan();
  const { user } = useAuth();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [draftConfig, setDraftConfig] = useState(DEFAULT_CONFIG);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [search, setSearch] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const carouselRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const loadConfig = async () => {
    try {
      const raw = await AsyncStorage.getItem(CATALOGO_CONFIG_KEY);
      if (raw) {
        const loaded = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
        setConfig(loaded);
        setDraftConfig(loaded);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const updateDraft = (updates) => {
    setDraftConfig((prev) => ({ ...prev, ...updates }));
  };

  const saveConfig = async () => {
    playTapSound();
    setSaving(true);
    try {
      await AsyncStorage.setItem(CATALOGO_CONFIG_KEY, JSON.stringify(draftConfig));
      setConfig(draftConfig);
      setEditando(false);
    } catch (_) {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    }
    setSaving(false);
  };

  const openEdit = () => {
    setDraftConfig(config);
    setEditando(true);
  };

  const pickFotoCatalogo = async () => {
    playTapSound();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: !!user,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (user && asset.base64) {
      setUploadingFoto(true);
      try {
        const url = await uploadClientPhoto(asset.base64, user.id, 'catalogo-profissional');
        updateDraft({ fotoCatalogo: url });
      } catch (e) {
        console.warn('Erro upload foto catálogo:', e);
        Alert.alert('Erro', 'Não foi possível fazer upload da foto.');
      }
      setUploadingFoto(false);
    } else if (asset.uri) {
      updateDraft({ fotoCatalogo: asset.uri });
    }
  };

  const produtosFiltrados = (products || []).filter(
    (p) => !search.trim() || (p.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const servicosFiltrados = (services || []).filter(
    (s) => !search.trim() || (s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const mostraProdutos = config.tipo === 'produtos' || config.tipo === 'ambos';
  const mostraServicos = config.tipo === 'servicos' || config.tipo === 'ambos';

  const itensCarrossel = [
    ...(mostraProdutos ? produtosFiltrados.map((p) => ({ ...p, _tipo: 'produto' })) : []),
    ...(mostraServicos ? servicosFiltrados.map((s) => ({ ...s, _tipo: 'servico' })) : []),
  ];
  const CAROUSEL_INTERVAL = 4000;
  useEffect(() => {
    if (config.layout !== 'carrossel' || itensCarrossel.length <= 1) return;
    const t = setInterval(() => {
      setCarouselIndex((prev) => {
        const next = (prev + 1) % itensCarrossel.length;
        carouselRef.current?.scrollToOffset({ offset: next * CAROUSEL_ITEM_W, animated: true });
        return next;
      });
    }, CAROUSEL_INTERVAL);
    return () => clearInterval(t);
  }, [config.layout, itensCarrossel.length]);

  const itensPorCategoria = categoriaAtiva === 'produtos'
    ? produtosFiltrados.map((p) => ({ ...p, _tipo: 'produto' }))
    : categoriaAtiva === 'servicos'
      ? servicosFiltrados.map((s) => ({ ...s, _tipo: 'servico' }))
      : [
          ...produtosFiltrados.map((p) => ({ ...p, _tipo: 'produto' })),
          ...servicosFiltrados.map((s) => ({ ...s, _tipo: 'servico' })),
        ];

  const compartilhar = async () => {
    playTapSound();
    let texto = `*${config.titulo}*\n${config.subtitulo}\n\n`;
    if (mostraProdutos && produtosFiltrados.length > 0) {
      texto += '📦 *Produtos:*\n';
      produtosFiltrados.slice(0, 15).forEach((p) => {
        const preco = p.discount ? (p.price - (p.discount || 0)) : p.price;
        const promo = p.discount ? ` (Promo: ${formatCurrency(preco)})` : '';
        texto += `• ${p.name} - ${formatCurrency(p.price)}${promo}\n`;
      });
      texto += '\n';
    }
    if (mostraServicos && servicosFiltrados.length > 0) {
      texto += '🔧 *Serviços:*\n';
      servicosFiltrados.slice(0, 15).forEach((s) => {
        const preco = s.discount ? (s.price - (s.discount || 0)) : s.price;
        const promo = s.discount ? ` (Promo: ${formatCurrency(preco)})` : '';
        texto += `• ${s.name} - ${formatCurrency(s.price)}${promo}\n`;
      });
    }
    try {
      await Share.share({
        message: texto,
        title: config.titulo,
      });
    } catch (e) {
      if (e.message !== 'User did not share') Alert.alert('Erro', 'Não foi possível compartilhar.');
    }
  };

  const renderHeader = () => (
    <View style={[s.header, { backgroundColor: config.corPrincipal }]}>
      {config.usaLogo && (config.fotoCatalogo || profile?.foto || profile?.fotoLocal) ? (
        <Image source={{ uri: config.fotoCatalogo || profile?.fotoLocal || profile?.foto }} style={s.logoImg} resizeMode="cover" />
      ) : config.usaLogo ? (
        <View style={[s.logoSymbol, { backgroundColor: config.corPrincipal + '40' }]}>
          <Ionicons name="person" size={36} color="#fff" />
        </View>
      ) : null}
      {config.usaNomeProfissional && (
        <Text style={s.empresaNome}>{config.nomeProfissional || profile?.nome || profile?.empresa || 'Profissional'}</Text>
      )}
      <Text style={[s.tituloCat, { color: '#fff' }]}>{config.titulo}</Text>
      {config.subtitulo ? <Text style={s.subtituloCat}>{config.subtitulo}</Text> : null}
    </View>
  );

  const isVertical = config.layout === 'vertical';
  const isHorizontal = config.layout === 'horizontal';
  const fotoStyle = isVertical ? [s.itemFoto, { width: 64, height: 64, aspectRatio: undefined }] : s.itemFoto;
  const cardStyle = isVertical ? s.itemCardVertical : isHorizontal ? s.itemCardHorizontal : null;
  const renderItemProduto = (p) => {
    const preco = p.discount ? (p.price - (p.discount || 0)) : p.price;
    const temPromo = !!(p.discount && p.discount > 0);
    return (
      <View key={p.id} style={[s.itemCard, cardStyle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(p.photoUri || p.photoUris?.[0]) ? (
          <Image source={{ uri: p.photoUri || p.photoUris[0] }} style={fotoStyle} resizeMode="cover" />
        ) : (
          <View style={[fotoStyle, s.itemFotoPlaceholder, { backgroundColor: config.corPrincipal + '20' }]}>
            <Ionicons name="cube" size={isVertical ? 24 : 28} color={config.corPrincipal} />
          </View>
        )}
        <View style={[s.itemInfo, isVertical && { flex: 1, padding: 10 }]}>
          <Text style={[s.itemNome, { color: colors.text }]} numberOfLines={2}>{p.name}</Text>
          <View style={s.itemPrecoRow}>
            {temPromo && (
              <Text style={[s.itemPrecoAntigo, { color: colors.textSecondary }]}>{formatCurrency(p.price)}</Text>
            )}
            <Text style={[s.itemPreco, { color: config.corPrincipal }]}>{formatCurrency(preco)}</Text>
            {temPromo && <View style={[s.promoBadge, { backgroundColor: '#ef4444' }]}><Text style={s.promoBadgeText}>PROMO</Text></View>}
          </View>
        </View>
      </View>
    );
  };

  const renderItemServico = (s) => {
    const preco = s.discount ? (s.price - (s.discount || 0)) : s.price;
    const temPromo = !!(s.discount && s.discount > 0);
    return (
      <View key={s.id} style={[s.itemCard, cardStyle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {s.photoUri ? (
          <Image source={{ uri: s.photoUri }} style={fotoStyle} resizeMode="cover" />
        ) : (
          <View style={[fotoStyle, s.itemFotoPlaceholder, { backgroundColor: config.corPrincipal + '20' }]}>
            <Ionicons name="construct" size={isVertical ? 24 : 28} color={config.corPrincipal} />
          </View>
        )}
        <View style={[s.itemInfo, isVertical && { flex: 1, padding: 10 }]}>
          <Text style={[s.itemNome, { color: colors.text }]} numberOfLines={2}>{s.name}</Text>
          <View style={s.itemPrecoRow}>
            {temPromo && <Text style={[s.itemPrecoAntigo, { color: colors.textSecondary }]}>{formatCurrency(s.price)}</Text>}
            <Text style={[s.itemPreco, { color: config.corPrincipal }]}>{formatCurrency(preco)}</Text>
            {temPromo && <View style={[s.promoBadge, { backgroundColor: '#ef4444' }]}><Text style={s.promoBadgeText}>PROMO</Text></View>}
          </View>
        </View>
      </View>
    );
  };

  const renderItemUnificado = (item) => (item._tipo === 'servico' ? renderItemServico(item) : renderItemProduto(item));
  const CAROUSEL_ITEM_W = SW - 32;
  const cardCarrossel = { width: CAROUSEL_ITEM_W, minWidth: CAROUSEL_ITEM_W };

  if (!showEmpresaFeatures) {
    return (
      <View style={[s.container, { backgroundColor: colors.bg }]}>
        <View style={[s.empty, { flex: 1, justifyContent: 'center', paddingVertical: 64 }]}>
          <Ionicons name="business-outline" size={64} color={colors.textSecondary} />
          <Text style={[s.emptyText, { color: colors.text, fontSize: 16, marginBottom: 8 }]}>Catálogo disponível apenas para planos empresa</Text>
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>Faça upgrade do seu plano para acessar o catálogo de produtos e serviços.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      {isModal && onClose && (
        <View style={[s.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[s.topBarTitle, { color: colors.text }]}>Catálogo de produtos e serviços</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Config */}
        <View style={[s.configCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => { playTapSound(); if (!editando) openEdit(); setEditando(!editando); }} style={s.configHeader}>
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
            <Text style={[s.configTitle, { color: colors.text }]}>Editar catálogo</Text>
            <Ionicons name={editando ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {editando && (
            <View style={s.configBody}>
              <Text style={[s.configLabel, { color: colors.textSecondary }]}>Foto do profissional</Text>
              <TouchableOpacity onPress={pickFotoCatalogo} disabled={uploadingFoto} style={[s.fotoUploadRow, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                {(draftConfig.fotoCatalogo || profile?.foto || profile?.fotoLocal) ? (
                  <Image source={{ uri: draftConfig.fotoCatalogo || profile?.fotoLocal || profile?.foto }} style={s.fotoUploadImg} resizeMode="cover" />
                ) : (
                  <View style={[s.fotoUploadPlaceholder, { backgroundColor: colors.primaryRgba?.(0.2) }]}>
                    <Ionicons name="camera" size={28} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {uploadingFoto ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{draftConfig.fotoCatalogo ? 'Trocar foto' : 'Fazer upload da foto'}</Text>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { playTapSound(); updateDraft({ usaLogo: !draftConfig.usaLogo }); }} style={s.toggleRow}>
                <Ionicons name={draftConfig.usaLogo ? 'image' : 'image-outline'} size={20} color={colors.primary} />
                <Text style={[s.toggleLabel, { color: colors.text }]}>Mostrar foto do profissional</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { playTapSound(); updateDraft({ usaNomeProfissional: !draftConfig.usaNomeProfissional }); }} style={s.toggleRow}>
                <Ionicons name={draftConfig.usaNomeProfissional ? 'person' : 'person-outline'} size={20} color={colors.primary} />
                <Text style={[s.toggleLabel, { color: colors.text }]}>Mostrar nome do profissional</Text>
              </TouchableOpacity>
              <Text style={[s.configLabel, { color: colors.textSecondary, marginTop: 12 }]}>Exibir</Text>
              <View style={s.configRow}>
                {TIPO_OPCOES.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    onPress={() => { playTapSound(); updateDraft({ tipo: o.id }); }}
                    style={[s.configChip, { borderColor: draftConfig.tipo === o.id ? draftConfig.corPrincipal : colors.border, backgroundColor: draftConfig.tipo === o.id ? draftConfig.corPrincipal + '20' : colors.bg }]}
                  >
                    <Ionicons name={o.icon} size={18} color={draftConfig.tipo === o.id ? draftConfig.corPrincipal : colors.textSecondary} />
                    <Text style={[s.configChipText, { color: draftConfig.tipo === o.id ? draftConfig.corPrincipal : colors.text }]} numberOfLines={1}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[s.configLabel, { color: colors.textSecondary, marginTop: 12 }]}>Layout</Text>
              <View style={s.configRow}>
                {LAYOUT_OPCOES.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    onPress={() => { playTapSound(); updateDraft({ layout: o.id }); }}
                    style={[s.configChip, { borderColor: draftConfig.layout === o.id ? draftConfig.corPrincipal : colors.border, backgroundColor: draftConfig.layout === o.id ? draftConfig.corPrincipal + '20' : colors.bg }]}
                  >
                    <Ionicons name={o.icon} size={18} color={draftConfig.layout === o.id ? draftConfig.corPrincipal : colors.textSecondary} />
                    <Text style={[s.configChipText, { color: draftConfig.layout === o.id ? draftConfig.corPrincipal : colors.text }]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[s.configLabel, { color: colors.textSecondary, marginTop: 12 }]}>Cor do tema</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CORES_CATALOGO.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { playTapSound(); updateDraft({ corPrincipal: c }); }}
                    style={[s.colorDot, { backgroundColor: c, borderWidth: draftConfig.corPrincipal === c ? 3 : 0, borderColor: '#fff' }]}
                  />
                ))}
              </View>
              <Text style={[s.configLabel, { color: colors.textSecondary, marginTop: 12 }]}>Título</Text>
              <TextInput
                style={[s.input, { borderColor: colors.border, color: colors.text }]}
                value={draftConfig.titulo}
                onChangeText={(v) => updateDraft({ titulo: v })}
                placeholder="Título do catálogo"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[s.configLabel, { color: colors.textSecondary, marginTop: 8 }]}>Subtítulo</Text>
              <TextInput
                style={[s.input, { borderColor: colors.border, color: colors.text }]}
                value={draftConfig.subtitulo}
                onChangeText={(v) => updateDraft({ subtitulo: v })}
                placeholder="Subtítulo opcional"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[s.configLabel, { color: colors.textSecondary, marginTop: 12 }]}>Nome do profissional (opcional)</Text>
              <TextInput
                style={[s.input, { borderColor: colors.border, color: colors.text }]}
                value={draftConfig.nomeProfissional}
                onChangeText={(v) => updateDraft({ nomeProfissional: v })}
                placeholder="Deixe vazio para usar nome do perfil"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[s.configLabel, { color: colors.textSecondary, marginTop: 12 }]}>Cor de fundo do catálogo</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CORES_FUNDO.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { playTapSound(); updateDraft({ corFundo: c }); }}
                    style={[s.colorDot, { backgroundColor: c, borderWidth: draftConfig.corFundo === c ? 3 : 0, borderColor: colors.text }]}
                  />
                ))}
              </View>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={saveConfig} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Salvar alterações</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Busca */}
        <TextInput
          style={[s.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Buscar produtos ou serviços..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />

        {/* Preview do catálogo */}
        <View style={[s.previewCard, { backgroundColor: config.corFundo || '#fff', borderColor: colors.border }]}>
          {renderHeader()}
          <ScrollView style={s.previewScroll} showsVerticalScrollIndicator contentContainerStyle={[s.previewContent, { backgroundColor: config.corFundo || '#fff' }]}>
            {config.layout === 'carrossel' && itensCarrossel.length > 0 && (
              <View style={s.secao}>
                <FlatList
                  ref={carouselRef}
                  data={itensCarrossel}
                  horizontal
                  pagingEnabled
                  snapToInterval={CAROUSEL_ITEM_W}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(i) => i.id}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_ITEM_W);
                    setCarouselIndex(Math.min(idx, itensCarrossel.length - 1));
                  }}
                  renderItem={({ item }) => (
                    <View style={[s.itemCard, cardCarrossel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {(item.photoUri || item.photoUris?.[0]) ? (
                        <Image source={{ uri: item.photoUri || item.photoUris[0] }} style={[s.itemFotoCarrossel, { backgroundColor: config.corPrincipal + '15' }]} resizeMode="cover" />
                      ) : (
                        <View style={[s.itemFotoCarrossel, s.itemFotoPlaceholder, { backgroundColor: config.corPrincipal + '20' }]}>
                          <Ionicons name={item._tipo === 'servico' ? 'construct' : 'cube'} size={48} color={config.corPrincipal} />
                        </View>
                      )}
                      <View style={s.itemInfoCarrossel}>
                        <Text style={[s.itemNomeCarrossel, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                        <Text style={[s.itemPrecoCarrossel, { color: config.corPrincipal }]}>
                          {formatCurrency(item.discount ? (item.price - (item.discount || 0)) : item.price)}
                        </Text>
                      </View>
                    </View>
                  )}
                />
                {itensCarrossel.length > 1 && (
                  <View style={s.carouselDots}>
                    {itensCarrossel.map((_, i) => (
                      <View key={i} style={[s.carouselDot, { backgroundColor: carouselIndex === i ? config.corPrincipal : colors.border }]} />
                    ))}
                  </View>
                )}
              </View>
            )}
            <View style={s.secao}>
              <View style={[s.categoriaTabs, { borderBottomColor: colors.border }]}>
                {CATEGORIA_TABS.filter((c) => config.tipo === 'ambos' || c.id === config.tipo || c.id === 'todos').map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => { playTapSound(); setCategoriaAtiva(cat.id); }}
                    style={[s.categoriaTab, categoriaAtiva === cat.id && { borderBottomWidth: 2, borderBottomColor: config.corPrincipal }]}
                  >
                    <Text style={[s.categoriaTabText, { color: categoriaAtiva === cat.id ? config.corPrincipal : colors.textSecondary }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {itensPorCategoria.length > 0 ? (
              config.layout === 'horizontal' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowHorizontalScroll}>
                  {itensPorCategoria.map(renderItemUnificado)}
                </ScrollView>
              ) : (
                <View style={config.layout === 'grid' || config.layout === 'carrossel' ? s.grid3x4 : s.rowVertical}>
                  {itensPorCategoria.map(renderItemUnificado)}
                </View>
              )
            ) : (mostraProdutos || mostraServicos) ? (
              <View style={s.empty}>
                <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} />
                <Text style={[s.emptyText, { color: colors.textSecondary }]}>Cadastre produtos e serviços em Cadastros</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <TouchableOpacity style={[s.shareBtn, { backgroundColor: '#25D366' }]} onPress={compartilhar}>
          <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          <Text style={s.shareBtnText}>Compartilhar catálogo via WhatsApp</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  topBarTitle: { fontSize: 16, fontWeight: '700' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  configCard: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  configHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  configTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  configBody: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  configLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  configRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  configChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  configChipText: { fontSize: 12, fontWeight: '600' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  toggleLabel: { fontSize: 14 },
  fotoUploadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  fotoUploadImg: { width: 56, height: 56, borderRadius: 28 },
  fotoUploadPlaceholder: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  previewCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', maxHeight: 560 },
  previewScroll: { maxHeight: 480 },
  previewContent: { padding: 12, paddingBottom: 24 },
  header: { alignItems: 'center', padding: 20, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  logoImg: { width: 64, height: 64, borderRadius: 32, marginBottom: 8 },
  logoSymbol: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  empresaNome: { fontSize: 14, fontWeight: '700', color: '#fff', opacity: 0.95 },
  tituloCat: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  subtituloCat: { fontSize: 12, color: '#fff', opacity: 0.9, marginTop: 4 },
  secao: { marginTop: 16 },
  secaoTitulo: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  rowHorizontal: { flexDirection: 'row', gap: 10 },
  rowHorizontalScroll: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  rowVertical: { gap: 8 },
  grid3x4: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  itemCard: { width: (SW - 56) / 3 - 8, minWidth: 90, minHeight: 140, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  itemCardVertical: { width: '100%', minWidth: '100%', minHeight: 80, flexDirection: 'row', alignItems: 'center' },
  itemCardHorizontal: { width: 120, minWidth: 120, minHeight: 140 },
  itemFoto: { width: '100%', aspectRatio: 1 },
  itemFotoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  itemInfo: { padding: 6 },
  itemNome: { fontSize: 11, fontWeight: '600', lineHeight: 14 },
  itemPrecoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  itemPrecoAntigo: { fontSize: 9, textDecorationLine: 'line-through' },
  itemPreco: { fontSize: 12, fontWeight: '700' },
  promoBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  promoBadgeText: { fontSize: 8, fontWeight: '700', color: '#fff' },
  itemFotoCarrossel: { width: '100%', height: 140, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  itemInfoCarrossel: { padding: 12 },
  itemNomeCarrossel: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  itemPrecoCarrossel: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  carouselDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  carouselDot: { width: 6, height: 6, borderRadius: 3 },
  categoriaTabs: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 12 },
  categoriaTab: { paddingVertical: 10, paddingHorizontal: 14, marginRight: 4 },
  categoriaTabText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 14, marginTop: 20 },
  shareBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
