import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../../utils/sounds';
import {
  CATALOGO_FONTES,
  CATALOGO_FONT_GROUPS,
  MAX_FONTES_USUARIO,
  getCatalogoFonte,
  ensureCatalogoFonts,
  uploadCatalogoUserFont,
  deleteCatalogoUserFontFile,
  remapHeroFontsAfterDelete,
  normalizeFontesUsuario,
  normalizeFontesFavoritas,
} from '../../utils/catalogoFonts';

function FontRow({
  font,
  selected,
  favorite,
  compact,
  onSelect,
  onPreview,
  onToggleFavorite,
}) {
  const familyStyle = font.family ? { fontFamily: font.family } : null;
  return (
    <Pressable
      onPress={() => {
        playTapSound();
        onSelect?.(font.id);
      }}
      onHoverIn={() => onPreview?.(font.id)}
      onHoverOut={() => onPreview?.(null)}
      style={[st.row, compact && st.rowCompact, selected && st.rowOn]}
    >
      <Text style={[st.sample, compact && st.sampleCompact, familyStyle]} numberOfLines={1}>
        {font.label}
      </Text>
      <Pressable
        onPress={() => {
          playTapSound();
          onToggleFavorite?.(font.id);
        }}
        onHoverIn={() => onPreview?.(font.id)}
        hitSlop={8}
        style={st.starBtn}
      >
        <Ionicons name={favorite ? 'star' : 'star-outline'} size={compact ? 13 : 16} color={favorite ? '#fbbf24' : '#94a3b8'} />
      </Pressable>
    </Pressable>
  );
}

export function CatalogoFontPicker({
  visible,
  title,
  value,
  config,
  onSelect,
  onPreview,
  onFontsChange,
  onClose,
  compact = false,
  live = false,
  ownerUserId,
}) {
  const fileRef = useRef(null);
  const pendingFile = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [replaceAsk, setReplaceAsk] = useState(false);
  const [replaceId, setReplaceId] = useState('');

  const userFonts = useMemo(() => normalizeFontesUsuario(config?.fontesUsuario), [config?.fontesUsuario]);
  const favorites = useMemo(() => normalizeFontesFavoritas(config?.fontesFavoritas, config), [config]);

  useEffect(() => {
    if (visible) ensureCatalogoFonts(config);
  }, [visible, config?.fontesUsuario]);

  useEffect(() => {
    if (!visible) {
      onPreview?.(null);
      setReplaceAsk(false);
      pendingFile.current = null;
      setError('');
    }
  }, [visible, onPreview]);

  const current = getCatalogoFonte(value, config);
  const favoriteFonts = favorites
    .map((id) => getCatalogoFonte(id, config))
    .filter((f) => f && (userFonts.some((u) => u.id === f.id) || CATALOGO_FONTES.some((a) => a.id === f.id)));

  const commitFonts = (nextUsers, nextFavs, extra) => {
    onFontsChange?.({
      fontesUsuario: nextUsers,
      fontesFavoritas: normalizeFontesFavoritas(nextFavs, { fontesUsuario: nextUsers }),
      ...(extra || {}),
    });
  };

  const toggleFavorite = (id) => {
    const on = favorites.includes(id);
    const next = on ? favorites.filter((x) => x !== id) : [id, ...favorites];
    commitFonts(userFonts, next);
  };

  const applyUploaded = async (file, removeFont) => {
    setUploading(true);
    setError('');
    try {
      const created = await uploadCatalogoUserFont(file, ownerUserId);
      let nextUsers = userFonts;
      const extra = {};
      if (removeFont) {
        nextUsers = userFonts.filter((f) => f.id !== removeFont.id);
        extra.fontesFavoritas = favorites.filter((id) => id !== removeFont.id);
        Object.assign(extra, remapHeroFontsAfterDelete(config, removeFont.id));
        await deleteCatalogoUserFontFile(removeFont, ownerUserId);
      }
      nextUsers = [...nextUsers, created];
      commitFonts(nextUsers, extra.fontesFavoritas || favorites, extra);
      ensureCatalogoFonts({ fontesUsuario: nextUsers });
      onSelect?.(created.id);
    } catch (e) {
      setError(e?.message || 'Não foi possível enviar a fonte.');
    } finally {
      setUploading(false);
      pendingFile.current = null;
      setReplaceAsk(false);
    }
  };

  const onPickedFile = (file) => {
    if (!file) return;
    if (!ownerUserId) {
      setError('Entre na conta para enviar fontes.');
      return;
    }
    if (userFonts.length < MAX_FONTES_USUARIO) {
      applyUploaded(file, null);
      return;
    }
    pendingFile.current = file;
    setReplaceId(userFonts[0]?.id || '');
    setReplaceAsk(true);
    setError('');
  };

  const confirmReplace = () => {
    const file = pendingFile.current;
    const victim = userFonts.find((f) => f.id === replaceId) || userFonts[0];
    if (!file || !victim) {
      setReplaceAsk(false);
      return;
    }
    applyUploaded(file, victim);
  };

  const openFilePicker = () => {
    playTapSound();
    if (Platform.OS === 'web') fileRef.current?.click?.();
    else setError('Envie a fonte pelo computador (arquivo .ttf, .otf, .woff ou .woff2).');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[st.bg, compact && st.bgCompact]} onPress={onClose}>
        <Pressable style={[st.sheet, compact && st.sheetCompact]} onPress={(e) => e.stopPropagation()}>
          <Text style={[st.title, compact && st.titleCompact]}>{title || 'Fonte'}</Text>
          <Text style={st.current} numberOfLines={1}>{current.label}</Text>
          <Text style={st.hint}>Passe o mouse para pré-visualizar. Clique para aplicar. Ao sair, volta a fonte atual.</Text>

          {Platform.OS === 'web' ? (
            <input
              ref={fileRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                onPickedFile(file);
              }}
            />
          ) : null}

          <Pressable onPress={openFilePicker} disabled={uploading} style={st.uploadBtn}>
            {uploading ? (
              <ActivityIndicator size="small" color="#93c5fd" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={16} color="#93c5fd" />
            )}
            <Text style={st.uploadText}>
              {`Enviar fonte (${userFonts.length}/${MAX_FONTES_USUARIO})`}
            </Text>
          </Pressable>

          {error ? <Text style={st.error}>{error}</Text> : null}

          {replaceAsk ? (
            <View style={st.replaceBox}>
              <Text style={st.replaceTitle}>Substituir fonte?</Text>
              <Text style={st.replaceBody}>
                Você já enviou 5 fontes. Para enviar outra, uma fonte antiga será excluída. Isso apaga o arquivo e ela some da loja. Textos que usavam essa fonte voltam para a padrão.
              </Text>
              {userFonts.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => setReplaceId(f.id)}
                  style={[st.replaceRow, replaceId === f.id && st.replaceRowOn]}
                >
                  <Ionicons name={replaceId === f.id ? 'radio-button-on' : 'radio-button-off'} size={16} color="#93c5fd" />
                  <Text style={st.replaceLabel} numberOfLines={1}>{f.label}</Text>
                </Pressable>
              ))}
              <View style={st.replaceActions}>
                <Pressable
                  onPress={() => {
                    pendingFile.current = null;
                    setReplaceAsk(false);
                  }}
                  style={st.replaceCancel}
                >
                  <Text style={st.replaceCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={confirmReplace} style={st.replaceOk}>
                  <Text style={st.replaceOkText}>Excluir e substituir</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <ScrollView
              style={compact ? st.listCompact : st.list}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              onMouseLeave={() => onPreview?.(null)}
            >
              {favoriteFonts.length ? (
                <View style={{ marginBottom: compact ? 8 : 14 }}>
                  <Text style={st.group}>Favoritas</Text>
                  {favoriteFonts.map((f) => (
                    <FontRow
                      key={`fav-${f.id}`}
                      font={f}
                      selected={value === f.id || (!value && f.id === 'system')}
                      favorite
                      compact={compact}
                      onSelect={(id) => {
                        onSelect?.(id);
                        if (!live) onClose?.();
                      }}
                      onPreview={onPreview}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ marginBottom: compact ? 8 : 14 }}>
                <Text style={st.group}>Suas fontes</Text>
                {userFonts.length === 0 ? (
                  <Text style={st.emptyUser}>Nenhuma fonte enviada. Use Enviar fonte para um arquivo seu.</Text>
                ) : (
                  userFonts.map((f) => (
                    <FontRow
                      key={f.id}
                      font={f}
                      selected={value === f.id}
                      favorite={favorites.includes(f.id)}
                      compact={compact}
                      onSelect={(id) => {
                        onSelect?.(id);
                        if (!live) onClose?.();
                      }}
                      onPreview={onPreview}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))
                )}
              </View>

              {CATALOGO_FONT_GROUPS.map((group) => (
                <View key={group.id} style={{ marginBottom: compact ? 8 : 14 }}>
                  <Text style={st.group}>{`Banco de fontes · ${group.label}`}</Text>
                  {CATALOGO_FONTES.filter((f) => f.group === group.id).map((f) => (
                    <FontRow
                      key={f.id}
                      font={f}
                      selected={value === f.id || (!value && f.id === 'system')}
                      favorite={favorites.includes(f.id)}
                      compact={compact}
                      onSelect={(id) => {
                        onSelect?.(id);
                        if (!live) onClose?.();
                      }}
                      onPreview={onPreview}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          )}

          {live ? (
            <Pressable onPress={onClose} style={st.closeBtn}>
              <Text style={st.closeText}>Fechar</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  bgCompact: {
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 10,
    paddingBottom: 88,
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    maxHeight: '80%',
  },
  sheetCompact: {
    width: 280,
    maxHeight: 420,
    borderRadius: 12,
    padding: 8,
    backgroundColor: 'rgba(15,23,42,0.96)',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  titleCompact: { fontSize: 12, marginBottom: 2 },
  current: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  hint: { color: '#64748b', fontSize: 10, lineHeight: 14, marginBottom: 8 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.35)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginBottom: 8,
  },
  uploadText: { color: '#93c5fd', fontSize: 11, fontWeight: '700' },
  error: { color: '#fca5a5', fontSize: 11, marginBottom: 8 },
  replaceBox: { marginBottom: 8 },
  replaceTitle: { color: '#fff', fontWeight: '800', fontSize: 13, marginBottom: 6 },
  replaceBody: { color: '#cbd5e1', fontSize: 11, lineHeight: 15, marginBottom: 8 },
  replaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  replaceRowOn: { backgroundColor: 'rgba(37,99,235,0.28)' },
  replaceLabel: { color: '#fff', fontSize: 12, flex: 1 },
  replaceActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  replaceCancel: { paddingVertical: 8, paddingHorizontal: 10 },
  replaceCancelText: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
  replaceOk: { backgroundColor: '#b91c1c', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  replaceOkText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  list: { maxHeight: 420 },
  listCompact: { maxHeight: 240 },
  group: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 4, textTransform: 'uppercase' },
  emptyUser: { color: '#64748b', fontSize: 11, marginBottom: 6, lineHeight: 15 },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowCompact: { paddingVertical: 5, paddingHorizontal: 6, marginBottom: 2, borderRadius: 8 },
  rowOn: { backgroundColor: 'rgba(37,99,235,0.35)' },
  sample: { color: '#fff', fontSize: 18, flex: 1 },
  sampleCompact: { fontSize: 13 },
  starBtn: { padding: 2 },
  closeBtn: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  closeText: { color: '#93c5fd', fontSize: 12, fontWeight: '700' },
});
