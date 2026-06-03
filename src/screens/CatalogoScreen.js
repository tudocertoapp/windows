import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
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
import { openWhatsApp } from '../utils/whatsapp';
import { useIsDesktopLayout } from '../utils/platformLayout';
import { loadCatalogoConfig, saveCatalogoConfig } from '../utils/catalogoPersist';
import { readImageAsBase64 } from '../utils/readImageAsBase64';
import { filterEventsByDate, generateAvailableSlots } from '../utils/agendaAvailability';
import { copyLojaPublicLink, shareLojaPublicLink, buildLojaPublicUrl } from '../utils/lojaPublicLink';
import { CatalogoStoreView } from '../components/catalogo/CatalogoStoreView';
import { CatalogoEditorPanel } from '../components/catalogo/CatalogoEditorPanel';
import { LojaItemEditModal } from '../components/catalogo/LojaItemEditModal';
import {
  DEFAULT_CATALOGO_CONFIG,
  resolveCatalogoItems,
  syncCatalogoItens,
  buildCartWhatsAppMessage,
  itemKey,
  getLojaDisplayName,
  getLojaLogoUri,
  getHeroPosicoes,
} from '../utils/catalogoStore';

export function CatalogoScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { products, services, agendaEvents, updateProduct, updateService } = useFinance();
  const { profile } = useProfile();
  const { showEmpresaFeatures } = usePlan();
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
  const [editingItem, setEditingItem] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [cloudSaveStatus, setCloudSaveStatus] = useState('idle');
  const skipAutoSaveRef = useRef(true);
  const autoSaveTimerRef = useRef(null);

  const loadConfig = async () => {
    skipAutoSaveRef.current = true;
    try {
      const synced = await loadCatalogoConfig(user, products, services);
      setConfig(synced);
      setDraftConfig(synced);
    } catch (_) {}
    skipAutoSaveRef.current = false;
  };

  useEffect(() => {
    loadConfig();
  }, [user?.id]);

  useEffect(() => {
    setConfig((prev) => ({ ...prev, itens: syncCatalogoItens(prev, products, services) }));
    setDraftConfig((prev) => ({ ...prev, itens: syncCatalogoItens(prev, products, services) }));
  }, [products?.length, services?.length]);

  const updateDraft = useCallback((updates) => {
    setDraftConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const persistDraftToCloud = useCallback(async (showAlert = false) => {
    if (!user?.id) return { remote: false };
    const toSave = { ...draftConfig, itens: syncCatalogoItens(draftConfig, products, services) };
    setCloudSaveStatus('saving');
    try {
      const result = await saveCatalogoConfig(user, toSave);
      const saved = result.config || toSave;
      setConfig(saved);
      setDraftConfig(saved);
      setCloudSaveStatus(result.remote ? 'saved' : 'error');
      if (showAlert) {
        const msg = result.remote
          ? 'Sua loja foi salva na nuvem (configurações, textos e imagens).'
          : 'Salvo no aparelho. Verifique login e conexão para sincronizar com a nuvem.';
        Alert.alert('Salvo', msg);
      }
      return result;
    } catch (_) {
      setCloudSaveStatus('error');
      if (showAlert) Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
      return { remote: false };
    }
  }, [user, draftConfig, products, services]);

  useEffect(() => {
    if (skipAutoSaveRef.current || !user?.id) return undefined;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      persistDraftToCloud(false);
    }, 1600);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [draftConfig, user?.id, products?.length, services?.length, persistDraftToCloud]);

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
      allowsEditing: true,
      aspect: field === 'fotoFundo' ? [16, 9] : [1, 1],
      quality: field === 'fotoCatalogo' ? 0.92 : 0.85,
      base64: !!user?.id,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (field === 'fotoCatalogo') {
      setUploading(true);
      try {
        if (user?.id) {
          let base64 = asset.base64;
          if (!base64 && asset.uri) base64 = await readImageAsBase64(asset.uri);
          const { original, preview } = await uploadCatalogoLogoPair({ ...asset, base64 }, user.id);
          updateDraft({ fotoCatalogo: original, fotoCatalogoPreview: preview });
        } else if (asset.uri) {
          const previewUri = await createLocalLogoPreviewUri(asset);
          updateDraft({ fotoCatalogo: asset.uri, fotoCatalogoPreview: previewUri });
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
    await shareLojaPublicLink(user.id, getLojaDisplayName(config, profile));
  };

  const copiarLinkLoja = async () => {
    playTapSound();
    if (!user?.id) return Alert.alert('Link da loja', 'Faça login para copiar o link.');
    await copyLojaPublicLink(user.id, getLojaDisplayName(config, profile));
  };

  const lojaUrl = user?.id ? buildLojaPublicUrl(user.id) : '';

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

  const handleHeroPositionChange = useCallback((id, pos) => {
    setDraftConfig((prev) => ({
      ...prev,
      heroPosicoes: {
        ...getHeroPosicoes(prev),
        [id]: pos,
      },
    }));
  }, []);

  const saveEditedItem = async (data) => {
    if (!editingItem?.id) return;
    setSavingItem(true);
    try {
      if (editingItem._tipo === 'servico') {
        await updateService(editingItem.id, data);
      } else {
        await updateProduct(editingItem.id, data);
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
            <Text style={[s.topBarTitle, { color: colors.text }]}>Minha Loja</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={24} color={colors.primary} />
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
      onShareLink={compartilharLoja}
      onEditItem={openEditItemByRow}
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
      previewWidth={isDesktop ? previewW - 32 : previewW}
      interactive
      ownerMode
      onEditItem={openEditItem}
      onHeroPositionChange={handleHeroPositionChange}
    />
  );

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={[s.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.topBarTitle, { color: colors.text }]}>Minha Loja</Text>
          <Text style={[s.topBarSub, { color: colors.textSecondary }]}>
            {user?.id
              ? cloudSaveStatus === 'saving'
                ? 'Salvando na nuvem…'
                : cloudSaveStatus === 'saved'
                  ? 'Tudo salvo no Supabase (textos, layout e fotos)'
                  : cloudSaveStatus === 'error'
                    ? 'Último salvamento na nuvem falhou — toque em Salvar'
                    : 'Link público, carrinho, WhatsApp e agendamento online'
              : 'Faça login para salvar tudo na nuvem'}
          </Text>
        </View>
        <TouchableOpacity onPress={copiarLinkLoja} style={[s.iconBtn, { backgroundColor: colors.primaryRgba?.(0.15) }]}>
          <Ionicons name="link-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={compartilharLoja} style={[s.iconBtn, { backgroundColor: colors.primaryRgba?.(0.15) }]}>
          <Ionicons name="share-social-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        {isModal && onClose && (
          <TouchableOpacity onPress={onClose} style={[s.iconBtn, { backgroundColor: colors.primaryRgba?.(0.15), marginLeft: 8 }]}>
            <Ionicons name="close" size={22} color={colors.primary} />
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
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Pré-visualização ao vivo</Text>
              </View>
              <View style={s.previewFrame}>{loja}</View>
            </View>
          </>
        ) : mobileTab === 'editar' ? (
          editor
        ) : (
          <View style={{ flex: 1, padding: 12 }}>{loja}</View>
        )}
      </View>

      <LojaItemEditModal
        visible={!!editingItem}
        item={editingItem}
        onSave={saveEditedItem}
        onClose={() => setEditingItem(null)}
        userId={user?.id}
        saving={savingItem}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  topBarTitle: { fontSize: 17, fontWeight: '800' },
  topBarSub: { fontSize: 11, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  mobileTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  mobileTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  body: { flex: 1, flexDirection: 'row' },
  editorCol: { width: 380, maxWidth: '42%', borderRightWidth: 1 },
  previewCol: { flex: 1 },
  previewLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  previewFrame: { flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden' },
  emptyPlan: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
