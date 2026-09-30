import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { useProfile } from '../contexts/ProfileContext';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { playTapSound } from '../utils/sounds';
import { uploadClientPhoto } from '../utils/uploadClientPhoto';
import { uploadCatalogoLogoPair, createLocalLogoPreviewUri } from '../utils/catalogoLogoImage';
import { detectLogoTransparency, looksLikePng } from '../utils/logoChromaKey';
import { openWhatsApp } from '../utils/whatsapp';
import { useIsDesktopLayout } from '../utils/platformLayout';
import { loadCatalogoConfig, saveCatalogoConfig } from '../utils/catalogoPersist';
import { readImageAsBase64 } from '../utils/readImageAsBase64';
import { filterEventsByDate, generateAvailableSlots } from '../utils/agendaAvailability';
import { copyLojaPublicLink, shareLojaPublicLink, buildLojaPublicUrl, openLojaPreview } from '../utils/lojaPublicLink';
import { CatalogoStoreView } from '../components/catalogo/CatalogoStoreView';
import { HeroDockHost, HeroFxFloatHost } from '../components/catalogo/LojaHeroBanner';
import { CatalogoEditorPanel } from '../components/catalogo/CatalogoEditorPanel';
import { ProductFormModal } from '../components/ProductFormModal';
import { ServicoFormModal } from '../components/ServicoFormModal';
import {
  DEFAULT_CATALOGO_CONFIG,
  resolveCatalogoItems,
  syncCatalogoItens,
  buildCartWhatsAppMessage,
  itemKey,
  getLojaDisplayName,
  getLojaLogoUri,
  getHeroPosicoes,
  getCatalogoRotulos,
  HERO_SCALE_KEYS,
  clampHeroScale,
  isHeroExtraTextId,
  patchHeroTexto,
} from '../utils/catalogoStore';

export function CatalogoScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { products, services, agendaEvents, updateProduct, updateService } = useFinance();
  const { profile } = useProfile();
  const { showEmpresaFeatures, planFeatures } = usePlan();
  const { user } = useAuth();
  const isDesktop = useIsDesktopLayout();

  const [config, setConfig] = useState(DEFAULT_CATALOGO_CONFIG);
  const [draftConfig, setDraftConfig] = useState(DEFAULT_CATALOGO_CONFIG);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFundo, setUploadingFundo] = useState(false);
  const [mobileTab, setMobileTab] = useState('loja');
  const [cart, setCart] = useState([]);
  const [previewW, setPreviewW] = useState(Dimensions.get('window').width);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [editingItem, setEditingItem] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [cloudSaveStatus, setCloudSaveStatus] = useState('idle');
  const draftRef = useRef(draftConfig);
  draftRef.current = draftConfig;

  const markDraftDirty = useCallback(() => {
    setCloudSaveStatus((s) => (s === 'saving' ? s : 'dirty'));
  }, []);

  const loadConfig = async () => {
    try {
      const synced = await loadCatalogoConfig(user, products, services);
      setConfig(synced);
      setDraftConfig(synced);
      setCloudSaveStatus('idle');
    } catch (_) {}
  };

  useEffect(() => {
    loadConfig();
  }, [user?.id]);

  useEffect(() => {
    setConfig((prev) => ({ ...prev, itens: syncCatalogoItens(prev, products, services) }));
    setDraftConfig((prev) => ({ ...prev, itens: syncCatalogoItens(prev, products, services) }));
  }, [products?.length, services?.length]);

  const updateDraft = useCallback((updates) => {
    markDraftDirty();
    setDraftConfig((prev) => ({ ...prev, ...updates }));
  }, [markDraftDirty]);

  const persistDraftToCloud = useCallback(async (showAlert = false) => {
    if (!user?.id) return { remote: false };
    const latest = draftRef.current || draftConfig;
    const toSave = { ...latest, itens: syncCatalogoItens(latest, products, services) };
    setCloudSaveStatus('saving');
    try {
      const result = await saveCatalogoConfig(user, toSave);
      const saved = result.config || toSave;
      setConfig(saved);
      setDraftConfig(saved);
      setCloudSaveStatus(result.remote ? 'saved' : 'error');
      if (showAlert) {
        if (result.remote) {
          Alert.alert(
            'Salvo na sua conta',
            result.warning
              || 'Visual gravado na sua conta. O link público busca cores, textos, layout e imagens no Supabase — sem novo deploy.',
          );
        } else {
          Alert.alert('Não publicado', result.error || 'Salvo só neste aparelho. O link público ainda não recebeu o catálogo.');
        }
      }
      return result;
    } catch (_) {
      setCloudSaveStatus('error');
      if (showAlert) Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
      return { remote: false };
    }
  }, [user, products, services]);

  const saveConfig = async () => {
    playTapSound();
    setSaving(true);
    await persistDraftToCloud(true);
    setSaving(false);
  };

  const pickImage = async (field, setUploading) => {
    playTapSound();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: field !== 'fotoCatalogo',
      aspect: field === 'fotoFundo' ? [16, 9] : [1, 1],
      quality: field === 'fotoCatalogo' ? 1 : 0.85,
      base64: !!user?.id,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (field === 'fotoCatalogo') {
      setUploading(true);
      try {
        const hasAlpha = looksLikePng(asset.base64) || looksLikePng(asset.uri) || /png/i.test(asset.mimeType || '')
          || await detectLogoTransparency(asset.uri);
        const transparentPatch = hasAlpha
          ? { logoTemTransparencia: true, logoPlaca: false, logoMoldura: 'nenhuma', logoSemMoldura: true }
          : { logoTemTransparencia: false };
        if (user?.id) {
          let base64 = asset.base64;
          if (!base64 && asset.uri) base64 = await readImageAsBase64(asset.uri);
          const { original, preview, keepPng } = await uploadCatalogoLogoPair({ ...asset, base64 }, user.id);
          updateDraft({
            fotoCatalogo: original,
            fotoCatalogoPreview: keepPng ? original : preview,
            ...transparentPatch,
            logoTemTransparencia: keepPng || hasAlpha,
            ...(keepPng || hasAlpha ? { logoPlaca: false, logoMoldura: 'nenhuma', logoSemMoldura: true } : {}),
          });
        } else if (asset.uri) {
          const previewUri = hasAlpha ? asset.uri : await createLocalLogoPreviewUri(asset);
          updateDraft({ fotoCatalogo: asset.uri, fotoCatalogoPreview: previewUri, ...transparentPatch });
        }
      } catch (e) {
        console.warn('Erro upload logo loja:', e);
        Alert.alert('Erro', 'Não foi possível fazer upload da logo.');
      }
      setUploading(false);
      return;
    }
    if (user?.id) {
      setUploading(true);
      try {
        let base64 = asset.base64;
        if (!base64 && asset.uri) base64 = await readImageAsBase64(asset.uri);
        const url = await uploadClientPhoto(base64, user.id, field === 'fotoFundo' ? `catalogo-banner-${Date.now()}` : `catalogo-extra-${Date.now()}`);
        updateDraft({ [field]: url });
      } catch (e) {
        console.warn('Erro upload catálogo:', e);
        Alert.alert('Erro', 'Não foi possível fazer upload da imagem.');
      }
      setUploading(false);
    } else if (asset.uri) {
      updateDraft({ [field]: asset.uri });
    }
  };

  const previewConfig = draftConfig;
  const rotulos = getCatalogoRotulos(draftConfig);
  const storeItems = useMemo(
    () => resolveCatalogoItems(previewConfig, products, services),
    [previewConfig, products, services]
  );

  const addToCart = (item) => {
    const key = item._rowId || itemKey(item._tipo, item.id);
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
    if (qty < 1) {
      setCart((prev) => prev.filter((l) => l.key !== key));
      return;
    }
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, qty } : l)));
  };

  const removeFromCart = (key) => setCart((prev) => prev.filter((l) => l.key !== key));

  const fetchLocalAvailability = useCallback(async (date) => {
    const events = filterEventsByDate(agendaEvents, date);
    return {
      slots: generateAvailableSlots(previewConfig, events),
      busy: events.map((ev, idx) => ({
        id: ev.id || `local-${idx}`,
        time: ev.time,
        time_end: ev.timeEnd || ev.time_end,
        title: ev.title || ev.name || 'Ocupado',
      })),
    };
  }, [agendaEvents, previewConfig]);

  const sendCartWhatsApp = (extras = {}) => {
    const phone = previewConfig.whatsappPedido?.trim() || profile?.telefone;
    if (!phone?.trim()) {
      Alert.alert('WhatsApp', 'Configure o número de WhatsApp no editor ou no seu perfil.');
      return;
    }
    const msg = buildCartWhatsAppMessage(cart, previewConfig, profile, extras);
    openWhatsApp(phone, msg);
  };

  const compartilharLoja = async () => {
    playTapSound();
    if (!user?.id) {
      Alert.alert('Link da loja', 'Faça login para gerar o link público da sua loja.');
      return;
    }
    await shareLojaPublicLink(user.id, getLojaDisplayName(draftConfig, profile), draftConfig);
  };

  const copiarLinkLoja = async () => {
    playTapSound();
    if (!user?.id) return Alert.alert('Link da loja', 'Faça login para copiar o link.');
    await copyLojaPublicLink(user.id, getLojaDisplayName(draftConfig, profile), draftConfig);
  };

  const abrirVitrine = () => {
    playTapSound();
    if (!user?.id) return Alert.alert('Link da loja', 'Faça login para abrir a vitrine.');
    openLojaPreview(user.id, draftConfig);
  };

  const lojaUrl = user?.id ? buildLojaPublicUrl(user.id, draftConfig) : '';

  const openEditItem = useCallback((item) => {
    playTapSound();
    setEditingItem(item);
  }, []);

  const openEditItemByRow = useCallback((row) => {
    const src = row.tipo === 'servico'
      ? (services || []).find((s) => String(s.id) === String(row.id))
      : (products || []).find((p) => String(p.id) === String(row.id));
    if (!src) return;
    openEditItem({ ...src, _tipo: row.tipo, _rowId: itemKey(row.tipo, row.id) });
  }, [products, services, openEditItem]);

  const handleHeroScaleChange = useCallback((id, value) => {
    const next = clampHeroScale(value);
    markDraftDirty();
    setDraftConfig((prev) => {
      const key = HERO_SCALE_KEYS[id];
      if (key) return { ...prev, [key]: next };
      if (isHeroExtraTextId(id)) return { ...prev, heroTextos: patchHeroTexto(prev, id, { escala: next }) };
      return prev;
    });
  }, [markDraftDirty]);

  const handleCarouselCapaChange = useCallback((rowId, capa) => {
    if (!rowId) return;
    markDraftDirty();
    setDraftConfig((prev) => ({
      ...prev,
      carouselCapas: { ...(prev.carouselCapas || {}), [rowId]: capa },
    }));
  }, [markDraftDirty]);

  const handleHeroTextChange = useCallback((key, text) => {
    if (!key) return;
    markDraftDirty();
    setDraftConfig((prev) => ({ ...prev, [key]: text }));
  }, [markDraftDirty]);

  const handleHeroPositionChange = useCallback((id, pos) => {
    markDraftDirty();
    setDraftConfig((prev) => ({
      ...prev,
      heroPosicoes: id === '*'
        ? pos
        : {
          ...getHeroPosicoes(prev),
          [id]: pos,
        },
    }));
  }, [markDraftDirty]);

  const saveEditedItem = async (data) => {
    if (!editingItem?.id) return;
    if (data?._skipAdd) {
      setEditingItem(null);
      return;
    }
    setSavingItem(true);
    try {
      const payload = {
        ...data,
        photoUri: data.photoUri || data.photoUris?.[0] || null,
      };
      if (editingItem._tipo === 'servico') {
        await updateService(editingItem.id, payload);
      } else {
        await updateProduct(editingItem.id, payload);
      }
      if (data.description != null) {
        const rowId = editingItem._rowId || itemKey(editingItem._tipo || 'produto', editingItem.id);
        markDraftDirty();
        setDraftConfig((prev) => ({
          ...prev,
          itens: (prev.itens || []).map((row) => (
            itemKey(row.tipo, row.id) === rowId ? { ...row, descricao: data.description } : row
          )),
        }));
      }
      setEditingItem(null);
      Alert.alert('Salvo', 'Produto/serviço atualizado no app e na loja.');
    } catch (_) {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    }
    setSavingItem(false);
  };

  if (!showEmpresaFeatures) {
    return (
      <View style={[s.container, { backgroundColor: colors.bg }]}>
        {isModal && onClose && (
          <View style={[s.topBar, { borderBottomColor: colors.border }]}>
            <Text style={[s.topBarTitle, { color: colors.text }]}>{rotulos.menuLabel}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={s.emptyPlan}>
          <Ionicons name="storefront-outline" size={64} color={colors.textSecondary} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>Loja disponível no plano Empresa</Text>
          <Text style={[s.emptySub, { color: colors.textSecondary }]}>Faça upgrade para criar sua vitrine de produtos e serviços.</Text>
        </View>
      </View>
    );
  }

  const editor = (
    <CatalogoEditorPanel
      draftConfig={draftConfig}
      updateDraft={updateDraft}
      products={products}
      services={services}
      profile={profile}
      colors={colors}
      onSave={saveConfig}
      saving={saving}
      onPickLogo={() => pickImage('fotoCatalogo', setUploadingLogo)}
      onPickFundo={() => pickImage('fotoFundo', setUploadingFundo)}
      uploadingLogo={uploadingLogo}
      uploadingFundo={uploadingFundo}
      ownerUserId={user?.id}
      lojaUrl={lojaUrl}
      onCopyLink={copiarLinkLoja}
      onOpenStore={abrirVitrine}
      onShareLink={compartilharLoja}
      onEditItem={openEditItemByRow}
      onOpenPreview={() => setMobileTab('loja')}
      canPublishPublicStore={!!planFeatures?.canPublishPublicStore}
    />
  );

  const loja = (
    <CatalogoStoreView
      config={previewConfig}
      items={storeItems}
      profile={profile}
      cart={cart}
      onAddToCart={addToCart}
      onUpdateQty={updateQty}
      onRemoveFromCart={removeFromCart}
      onSendWhatsApp={sendCartWhatsApp}
      onFetchAvailability={previewConfig.agendamentoOnline !== false ? fetchLocalAvailability : undefined}
      previewWidth={previewDevice === 'mobile' ? 390 : (isDesktop ? previewW - 32 : previewW)}
      interactive
      ownerMode
      onEditItem={openEditItem}
      onHeroPositionChange={handleHeroPositionChange}
      onHeroScaleChange={handleHeroScaleChange}
      onHeroTextChange={handleHeroTextChange}
      onCarouselCapaChange={handleCarouselCapaChange}
      onPickLogo={() => pickImage('fotoCatalogo', setUploadingLogo)}
      ownerUserId={user?.id}
      layoutMode={previewDevice === 'mobile' || !isDesktop ? 'mobile' : 'desktop'}
    />
  );

  const heroDockBar = (
    <HeroDockHost style={[s.heroDockHost, { backgroundColor: colors.card, borderBottomColor: colors.border }]} />
  );

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={[s.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.topBarTitle, { color: colors.text }]}>{rotulos.menuLabel}</Text>
          <Text style={[s.topBarSub, { color: colors.textSecondary }]}>
            {user?.id
              ? cloudSaveStatus === 'saving'
                ? 'Salvando na sua conta…'
                : cloudSaveStatus === 'dirty'
                  ? 'Há alterações só nesta tela — toque em Salvar para atualizar o link público'
                  : cloudSaveStatus === 'saved'
                    ? 'Publicado. O link da loja já usa esta versão'
                    : cloudSaveStatus === 'error'
                      ? 'Não gravou na nuvem — toque em Salvar de novo'
                      : 'Toque em Salvar para gravar cores e layout na sua conta'
              : 'Faça login para salvar tudo na nuvem'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={saveConfig}
          disabled={saving || !user?.id}
          style={[s.saveTopBtn, { backgroundColor: colors.primary, opacity: saving || !user?.id ? 0.6 : 1 }]}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveTopBtnText}>Salvar</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={abrirVitrine}
          disabled={!user?.id}
          style={[s.viewStoreBtn, { backgroundColor: colors.primaryRgba?.(0.15), opacity: user?.id ? 1 : 0.6 }]}
        >
          <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
          <Text style={[s.viewStoreBtnText, { color: colors.primary }]}>Visualizar loja</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={copiarLinkLoja} style={[s.iconBtn, { backgroundColor: colors.primaryRgba?.(0.15) }]}>
          <Ionicons name="link-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={compartilharLoja} style={[s.iconBtn, { backgroundColor: colors.primaryRgba?.(0.15) }]}>
          <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {isModal && onClose && (
          <TouchableOpacity onPress={onClose} style={[s.iconBtn, { backgroundColor: colors.primaryRgba?.(0.15), marginLeft: 8 }]}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {!isDesktop && (
        <View style={[s.mobileTabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[s.mobileTab, mobileTab === 'loja' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { playTapSound(); setMobileTab('loja'); }}
          >
            <Ionicons name="storefront-outline" size={18} color={mobileTab === 'loja' ? colors.primary : colors.textSecondary} />
            <Text style={{ color: mobileTab === 'loja' ? colors.primary : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>Loja</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.mobileTab, mobileTab === 'editar' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { playTapSound(); setMobileTab('editar'); }}
          >
            <Ionicons name="color-palette-outline" size={18} color={mobileTab === 'editar' ? colors.primary : colors.textSecondary} />
            <Text style={{ color: mobileTab === 'editar' ? colors.primary : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>Personalizar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.body}>
        {isDesktop ? (
          <>
            <View style={[s.editorCol, { borderRightColor: colors.border, backgroundColor: colors.bg }]}>
              {editor}
            </View>
            <View
              style={[s.previewCol, { backgroundColor: colors.card }]}
              onLayout={(e) => setPreviewW(e.nativeEvent.layout.width)}
            >
              <View style={[s.previewLabel, { borderBottomColor: colors.border }]}>
                <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 }}>Pré-visualização</Text>
                <TouchableOpacity
                  onPress={() => { playTapSound(); setPreviewDevice('desktop'); }}
                  style={[s.deviceChip, previewDevice === 'desktop' && { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="desktop-outline" size={14} color={previewDevice === 'desktop' ? '#fff' : colors.textSecondary} />
                  <Text style={{ color: previewDevice === 'desktop' ? '#fff' : colors.textSecondary, fontSize: 11, fontWeight: '800' }}>Desktop</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { playTapSound(); setPreviewDevice('mobile'); }}
                  style={[s.deviceChip, previewDevice === 'mobile' && { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="phone-portrait-outline" size={14} color={previewDevice === 'mobile' ? '#fff' : colors.textSecondary} />
                  <Text style={{ color: previewDevice === 'mobile' ? '#fff' : colors.textSecondary, fontSize: 11, fontWeight: '800' }}>Celular</Text>
                </TouchableOpacity>
              </View>
              {heroDockBar}
              <View style={[s.previewFrame, previewDevice === 'mobile' && s.previewPhone]}>
                {loja}
              </View>
            </View>
          </>
        ) : mobileTab === 'editar' ? (
          editor
        ) : (
          <View style={{ flex: 1 }}>
            {heroDockBar}
            <View style={{ flex: 1, padding: 12 }}>{loja}</View>
          </View>
        )}
        <HeroFxFloatHost />
      </View>

      {editingItem?._tipo === 'servico' ? (
        <ServicoFormModal
          visible={!!editingItem}
          servico={editingItem}
          onSave={saveEditedItem}
          onClose={() => setEditingItem(null)}
        />
      ) : (
        <ProductFormModal
          visible={!!editingItem}
          editingItem={editingItem}
          onSave={saveEditedItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  topBarTitle: { fontSize: 17, fontWeight: '800' },
  topBarSub: { fontSize: 11, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveTopBtn: { height: 40, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', minWidth: 78 },
  saveTopBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  viewStoreBtn: { height: 40, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewStoreBtnText: { fontWeight: '800', fontSize: 13 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  mobileTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  mobileTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  body: { flex: 1, flexDirection: 'row', position: 'relative' },
  editorCol: { width: 380, maxWidth: '42%', borderRightWidth: 1 },
  previewCol: { flex: 1, position: 'relative', overflow: 'visible' },
  previewLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  deviceChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  previewFrame: { flex: 1, margin: 16, borderRadius: 16, overflow: 'visible' },
  previewPhone: {
    width: 390,
    maxWidth: '100%',
    alignSelf: 'center',
    marginVertical: 12,
    borderRadius: 28,
    borderWidth: 8,
    borderColor: '#0f172a',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  heroDockHost: { paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, overflow: 'visible', zIndex: 30 },
  emptyPlan: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
