import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { playTapSound } from '../../utils/sounds';
import { ProductCategoriesEditor } from './ProductCategoriesEditor';
import { CatalogoColorBrush } from './CatalogoColorBrush';
import { CatalogoSizeStepper } from './CatalogoSizeStepper';
import { ensureCatalogoGoogleFonts } from '../../utils/catalogoFonts';
import { LOJA_DEFAULT_HOST, normalizeLojaSlug, buildLojaPublicUrl } from '../../utils/lojaPublicLink';
import { getApiOrigin } from '../../lib/subscription';
import { supabase } from '../../lib/supabase';
import {
  CATALOGO_LAYOUTS,
  CATALOGO_TIPOS,
  CATALOGO_CARD_SIZES,
  CAROUSEL_SIZES,
  CAROUSEL_ESTILOS,
  CAROUSEL_ANIMS,
  CAROUSEL_SCOPES,
  CAROUSEL_SPEEDS,
  LOGO_TAMANHOS,
  LOGO_FORMATOS,
  HERO_ALINHAMENTOS,
  TITULO_TAMANHOS,
  HERO_ALTURAS,
  HERO_MOLDURAS,
  HERO_SOBREPOSICOES,
  TEMAS_ESCUROS,
  TEMAS_PRONTOS,
  applyTemaPronto,
  GRADIENTE_DIRECOES,
  TEMA_ESTILOS,
  buildHeroPresentation,
  getCatalogoTheme,
  getCatalogoRotulos,
  getGradientPoints,
  ROTULO_VITRINE_OPTS,
  syncCatalogoItens,
  itemKey,
  moveCatalogoItem,
  toggleCatalogoItemVisible,
  getLojaLogoUri,
  normalizeCoresTema,
} from '../../utils/catalogoStore';

const TABS = [
  { id: 'visual', label: 'Visual', icon: 'color-palette-outline' },
  { id: 'cabecalho', label: 'Cabeçalho', icon: 'image-outline' },
  { id: 'vitrine', label: 'Vitrine', icon: 'grid-outline' },
  { id: 'pedidos', label: 'Pedidos', icon: 'chatbubble-ellipses-outline' },
];

function Card({ title, hint, children, colors }) {
  return (
    <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {title ? <Text style={[st.cardTitle, { color: colors.text }]}>{title}</Text> : null}
      {hint ? <Text style={[st.hint, { color: colors.textSecondary }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function ChipRow({ options, value, onChange, colors, accent }) {
  return (
    <View style={st.chipRow}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <TouchableOpacity
            key={o.id}
            onPress={() => { playTapSound(); onChange(o.id); }}
            style={[st.chip, { borderColor: on ? accent : colors.border, backgroundColor: on ? accent : colors.bg }]}
          >
            {o.icon ? <Ionicons name={o.icon} size={15} color={on ? '#fff' : colors.textSecondary} /> : null}
            <Text style={[st.chipText, { color: on ? '#fff' : colors.text }]} numberOfLines={1}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SwitchLine({ label, value, onValueChange, colors, accent }) {
  return (
    <View style={[st.switchRow, { borderColor: colors.border }]}>
      <Text style={[st.switchLabel, { color: colors.text }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: accent }} />
    </View>
  );
}

function Field({ label, colors, children }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[st.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

export function CatalogoEditorPanel({
  draftConfig,
  updateDraft,
  products,
  services,
  profile,
  colors,
  onSave,
  saving,
  onPickLogo,
  onPickFundo,
  uploadingLogo,
  uploadingFundo,
  ownerUserId,
  lojaUrl,
  onCopyLink,
  onShareLink,
  onEditItem,
  onOpenPreview,
  canPublishPublicStore = false,
}) {
  const [tab, setTab] = useState('visual');
  const [colorSlot, setColorSlot] = useState(0);
  const [slugCheck, setSlugCheck] = useState({ status: 'idle', message: '' });
  const accent = draftConfig.corPrincipal || colors.primary;
  const theme = getCatalogoTheme(draftConfig);
  const rotulos = getCatalogoRotulos(draftConfig);
  const estilo = theme.estilo;

  useEffect(() => {
    ensureCatalogoGoogleFonts();
  }, []);

  useEffect(() => {
    if (!canPublishPublicStore) {
      setSlugCheck({ status: 'idle', message: '' });
      return undefined;
    }
    const raw = String(draftConfig.slugPublico || '').trim().toLowerCase();
    if (!raw) {
      setSlugCheck({ status: 'idle', message: '' });
      return undefined;
    }
    const normalized = normalizeLojaSlug(raw);
    if (!normalized) {
      setSlugCheck({ status: 'invalid', message: 'Use 3 a 40 caracteres: letras, números e hífen.' });
      return undefined;
    }
    let cancelled = false;
    setSlugCheck({ status: 'checking', message: 'Verificando disponibilidade…' });
    const timer = setTimeout(async () => {
      try {
        const origin = getApiOrigin()
          || (typeof window !== 'undefined' ? String(window.location.origin || '').replace(/\/$/, '') : '');
        if (!origin) {
          if (!cancelled) setSlugCheck({ status: 'idle', message: '' });
          return;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${origin}/api/loja/check-slug?slug=${encodeURIComponent(normalized)}`, {
          cache: 'no-store',
          headers,
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setSlugCheck({ status: 'idle', message: '' });
          return;
        }
        setSlugCheck({
          status: json.available ? 'available' : 'taken',
          message: json.available ? 'Disponível' : (json.reason || 'Esse nome no link já está em uso.'),
        });
      } catch (_) {
        if (!cancelled) setSlugCheck({ status: 'idle', message: '' });
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draftConfig.slugPublico, canPublishPublicStore]);

  const itemRows = useMemo(() => {
    const synced = syncCatalogoItens(draftConfig, products, services);
    const prodMap = new Map((products || []).map((p) => [String(p.id), p]));
    const servMap = new Map((services || []).map((s) => [String(s.id), s]));
    return synced
      .sort((a, b) => a.order - b.order)
      .map((row) => {
        const src = row.tipo === 'servico' ? servMap.get(row.id) : prodMap.get(row.id);
        return { ...row, name: src?.name || `${row.tipo} #${row.id}`, _key: itemKey(row.tipo, row.id) };
      })
      .filter((r) => r.name);
  }, [draftConfig, products, services]);

  const applyEstilo = (next) => {
    if (next === estilo) return;
    if (next === 'solido') {
      const cor = normalizeCoresTema(draftConfig)[0];
      updateDraft({
        temaEstilo: 'solido',
        corPrincipal: cor,
        coresTema: [cor],
        corFundo: draftConfig.corFundo || '#f8fafc',
        corTexto: draftConfig.corTexto || '#0f172a',
      });
      return;
    }
    if (next === 'gradiente') {
      const cores = normalizeCoresTema(draftConfig);
      const pack = cores.length >= 2 ? cores : [cores[0], '#a855f7'];
      updateDraft({
        temaEstilo: 'gradiente',
        coresTema: pack,
        corPrincipal: pack[0],
        corFundo: draftConfig.corFundo || '#f8fafc',
        corTexto: draftConfig.corTexto || '#0f172a',
        gradienteDirecao: draftConfig.gradienteDirecao || 'diagonal',
      });
      return;
    }
    if (next === 'escuro') {
      const e = TEMAS_ESCUROS[0];
      updateDraft({
        temaEstilo: 'escuro',
        tema: e.id,
        corPrincipal: e.corPrincipal,
        corFundo: e.corFundo,
        corTexto: e.corTexto,
        coresTema: [e.corPrincipal],
      });
      return;
    }
  };

  const setCorSlot = (cor) => {
    if (!cor) return;
    const cores = normalizeCoresTema(draftConfig);
    const next = [...cores];
    const idx = Math.min(colorSlot, next.length - 1);
    next[idx] = cor;
    updateDraft({
      temaEstilo: estilo === 'solido' ? 'solido' : (estilo === 'escuro' ? 'escuro' : 'gradiente'),
      coresTema: estilo === 'solido' ? [cor] : next,
      corPrincipal: estilo === 'solido' ? cor : next[0],
    });
  };

  const addCor = () => {
    const cores = normalizeCoresTema(draftConfig);
    if (cores.length >= 4) return;
    const next = [...cores, '#0ea5e9'];
    setColorSlot(next.length - 1);
    updateDraft({ temaEstilo: 'gradiente', coresTema: next, corPrincipal: next[0] });
  };

  const removeCor = (index) => {
    const cores = normalizeCoresTema(draftConfig);
    if (cores.length <= 2) return;
    const next = cores.filter((_, i) => i !== index);
    setColorSlot(Math.max(0, index - 1));
    updateDraft({ coresTema: next, corPrincipal: next[0] });
  };

  const refreshItens = (tipo) => {
    const next = { ...draftConfig, tipo };
    updateDraft({ tipo, itens: syncCatalogoItens(next, products, services) });
  };

  const logoUri = getLojaLogoUri(draftConfig, profile, { forEdit: true });
  useMemo(() => buildHeroPresentation(draftConfig), [draftConfig]);
  const inputStyle = [st.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }];
  const points = getGradientPoints(draftConfig.gradienteDirecao);

  return (
    <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={[st.linkBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="link-outline" size={18} color={accent} />
        <Text style={[st.linkText, { color: colors.text }]} numberOfLines={1}>
          {lojaUrl || rotulos.linkHint}
        </Text>
        <TouchableOpacity onPress={onCopyLink} disabled={!ownerUserId} hitSlop={8}>
          <Ionicons name="copy-outline" size={18} color={accent} />
        </TouchableOpacity>
      </View>

      <View style={[st.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {TABS.map((item) => {
          const on = tab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[st.tab, on && { backgroundColor: accent }]}
              onPress={() => { playTapSound(); setTab(item.id); }}
            >
              <Ionicons name={item.icon} size={16} color={on ? '#fff' : colors.textSecondary} />
              <Text style={[st.tabText, { color: on ? '#fff' : colors.textSecondary }]} numberOfLines={1}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'visual' && (
        <>
          <Card title="Chamar de Catálogo ou Loja" hint="Essa palavra aparece no menu, na página inicial e na vitrine pública." colors={colors}>
            <ChipRow
              options={ROTULO_VITRINE_OPTS}
              value={draftConfig.rotuloVitrine || 'catalogo'}
              onChange={(v) => {
                const atual = getCatalogoRotulos(draftConfig);
                const proximo = getCatalogoRotulos({ rotuloVitrine: v });
                updateDraft({
                  rotuloVitrine: v,
                  ...(!draftConfig.titulo || draftConfig.titulo === atual.tituloPadrao ? { titulo: proximo.tituloPadrao } : {}),
                });
              }}
              colors={colors}
              accent={accent}
            />
          </Card>

          <Card title="Temas prontos" hint="Claro, escuro e cinza, mais Material (Google), Fluent (Microsoft) e Commerce (Shopify)." colors={colors}>
            <View style={st.presetGrid}>
              {TEMAS_PRONTOS.map((t) => {
                const on = (draftConfig.temaPronto || '') === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => { playTapSound(); updateDraft(applyTemaPronto(draftConfig, t.id)); }}
                    style={[st.presetCard, { borderColor: on ? t.corPrincipal : colors.border, backgroundColor: t.corFundo }]}
                  >
                    <View style={[st.presetBar, { backgroundColor: t.corPrincipal }]} />
                    <Text style={{ color: t.corTexto, fontWeight: '800', fontSize: 13 }}>{t.label}</Text>
                    <Text style={{ color: t.corTexto, opacity: 0.7, fontSize: 10, fontWeight: '600' }}>{t.hint}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

            <Card title="Estilo do cabeçalho" hint="Sólido usa uma cor. Gradiente usa várias. Escuro deixa a vitrine noturna." colors={colors}>
            <View style={st.estiloGrid}>
              {TEMA_ESTILOS.map((item) => {
                const on = estilo === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => { playTapSound(); applyEstilo(item.id); }}
                    style={[st.estiloCard, { borderColor: on ? accent : colors.border, backgroundColor: on ? accent + '14' : colors.bg }]}
                  >
                    <Ionicons name={item.icon} size={18} color={on ? accent : colors.textSecondary} />
                    <Text style={{ color: on ? accent : colors.text, fontWeight: '700', fontSize: 12 }}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {estilo === 'solido' && (
            <Card title="Cor sólida" colors={colors}>
              <CatalogoColorBrush
                label="Cor do cabeçalho e botões"
                value={draftConfig.corPrincipal}
                onChange={(c) => updateDraft({ temaEstilo: 'solido', corPrincipal: c, coresTema: [c] })}
                colors={colors}
                accent={accent}
              />
            </Card>
          )}

          {estilo === 'gradiente' && (
            <Card title="Gradiente" hint="Toque numa faixa e use o pincel para escolher qualquer cor. De 2 a 4 cores formam o degradê." colors={colors}>
              <LinearGradient colors={theme.heroColors} start={points.start} end={points.end} style={st.multiPreview} />
              <View style={st.slotRow}>
                {theme.cores.map((cor, index) => (
                  <TouchableOpacity
                    key={`${cor}-${index}`}
                    onPress={() => { playTapSound(); setColorSlot(index); }}
                    style={[st.slot, { backgroundColor: cor, borderColor: colorSlot === index ? colors.text : 'transparent' }]}
                  >
                    {theme.cores.length > 2 ? (
                      <TouchableOpacity style={st.slotRemove} onPress={() => removeCor(index)} hitSlop={6}>
                        <Ionicons name="close" size={12} color="#fff" />
                      </TouchableOpacity>
                    ) : null}
                  </TouchableOpacity>
                ))}
                {theme.cores.length < 4 ? (
                  <TouchableOpacity style={[st.slotAdd, { borderColor: colors.border }]} onPress={() => { playTapSound(); addCor(); }}>
                    <Ionicons name="add" size={18} color={accent} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <CatalogoColorBrush
                label={`Cor ${colorSlot + 1} do degradê`}
                value={theme.cores[colorSlot] || theme.cores[0]}
                onChange={setCorSlot}
                colors={colors}
                accent={accent}
              />
              <Field label="Direção" colors={colors}>
                <ChipRow options={GRADIENTE_DIRECOES} value={draftConfig.gradienteDirecao || 'diagonal'} onChange={(v) => updateDraft({ gradienteDirecao: v })} colors={colors} accent={accent} />
              </Field>
            </Card>
          )}

          {estilo === 'escuro' && (
            <Card title="Tema escuro" hint="Fundo, cards e textos da vitrine ficam escuros. A cor principal continua nos botões." colors={colors}>
              <View style={st.gradGrid}>
                {TEMAS_ESCUROS.map((e) => {
                  const on = draftConfig.tema === e.id;
                  return (
                    <TouchableOpacity
                      key={e.id}
                      onPress={() => {
                        playTapSound();
                        updateDraft({
                          tema: e.id,
                          temaEstilo: 'escuro',
                          corPrincipal: e.corPrincipal,
                          corFundo: e.corFundo,
                          corTexto: e.corTexto,
                          coresTema: [e.corPrincipal],
                        });
                      }}
                      style={[st.darkCard, { backgroundColor: e.corFundo, borderColor: on ? e.corPrincipal : 'transparent' }]}
                    >
                      <View style={[st.darkDot, { backgroundColor: e.corPrincipal }]} />
                      <Text style={{ color: e.corTexto, fontWeight: '800', fontSize: 13 }}>{e.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <CatalogoColorBrush
                label="Cor dos botões"
                value={draftConfig.corPrincipal}
                onChange={(c) => updateDraft({ corPrincipal: c, coresTema: [c] })}
                colors={colors}
                accent={accent}
              />
            </Card>
          )}

          <Card title="Fundo da página" colors={colors}>
            <CatalogoColorBrush
              label="Cor de fundo da vitrine"
              value={draftConfig.corFundo}
              onChange={(c) => updateDraft({ corFundo: c, corTexto: draftConfig.corTexto || '#0f172a' })}
              colors={colors}
              accent={accent}
            />
            <Field label="Foto do banner" colors={colors}>
              <TouchableOpacity onPress={onPickFundo} disabled={uploadingFundo} style={[st.uploadRow, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                {draftConfig.fotoFundo ? (
                  <Image source={{ uri: draftConfig.fotoFundo }} style={[st.uploadImg, { borderRadius: 8, width: 80, height: 48 }]} resizeMode="cover" />
                ) : (
                  <View style={[st.uploadPh, { width: 80, height: 48, borderRadius: 8, backgroundColor: accent + '22' }]}>
                    <Ionicons name="image" size={22} color={accent} />
                  </View>
                )}
                <Text style={{ fontWeight: '700', color: accent, flex: 1 }}>
                  {uploadingFundo ? 'Enviando…' : (draftConfig.fotoFundo ? 'Trocar foto' : 'Enviar foto')}
                </Text>
              </TouchableOpacity>
            </Field>
            <SwitchLine label="Usar foto por cima do tema" value={!!draftConfig.usaFotoFundo} onValueChange={(v) => updateDraft({ usaFotoFundo: v })} colors={colors} accent={accent} />
          </Card>

          <Card title="Cores das fontes" hint="Cores do restante do catálogo: produtos, preços e texto sobre." colors={colors}>
            <CatalogoColorBrush label="Nome dos produtos" value={draftConfig.corFonteProduto || draftConfig.corTexto || '#0f172a'} onChange={(c) => updateDraft({ corFonteProduto: c, corTexto: c })} colors={colors} accent={accent} compact />
            <CatalogoColorBrush label="Preço" value={draftConfig.corFontePreco || draftConfig.corPrincipal} onChange={(c) => updateDraft({ corFontePreco: c })} colors={colors} accent={accent} compact />
            <CatalogoColorBrush label="Texto sobre" value={draftConfig.corFonteSobre || draftConfig.corTexto || '#0f172a'} onChange={(c) => updateDraft({ corFonteSobre: c })} colors={colors} accent={accent} compact />
          </Card>
        </>
      )}

      {tab === 'cabecalho' && (
        <>
          <Card title="Logo" colors={colors}>
            <TouchableOpacity onPress={onPickLogo} disabled={uploadingLogo} style={[st.uploadRow, { borderColor: colors.border, backgroundColor: colors.bg }]}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={st.uploadImg} resizeMode="cover" />
              ) : (
                <View style={[st.uploadPh, { backgroundColor: accent + '22' }]}>
                  <Ionicons name="camera" size={22} color={accent} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{uploadingLogo ? 'Enviando…' : (draftConfig.fotoCatalogo ? 'Trocar logo' : 'Enviar logo')}</Text>
                <Text style={[st.hint, { color: colors.textSecondary, marginBottom: 0, marginTop: 2 }]}>A versão pública usa a imagem em alta.</Text>
              </View>
            </TouchableOpacity>
            <View style={[st.headerEditRow, { borderColor: colors.border, backgroundColor: colors.bg, marginTop: 10 }]}>
              <CatalogoSizeStepper
                compact
                value={draftConfig.logoEscala ?? 100}
                onChange={(v) => updateDraft({ logoEscala: v })}
                colors={colors}
                accent={accent}
              />
              <View style={st.headerEditGap} />
              <View style={st.headerShow}>
                <Text style={[st.headerEditLabel, { color: colors.textSecondary }]}>Mostrar</Text>
                <Switch value={draftConfig.usaLogo !== false} onValueChange={(v) => updateDraft({ usaLogo: v })} trackColor={{ true: accent }} />
              </View>
            </View>
            <SwitchLine label="Logo sem moldura" value={!!draftConfig.logoSemMoldura} onValueChange={(v) => updateDraft({ logoSemMoldura: v })} colors={colors} accent={accent} />
            <Field label="Tamanho" colors={colors}>
              <ChipRow options={LOGO_TAMANHOS} value={draftConfig.logoTamanho || 'medio'} onChange={(v) => updateDraft({ logoTamanho: v })} colors={colors} accent={accent} />
            </Field>
            {draftConfig.logoSemMoldura ? (
              <Field label="Formato" colors={colors}>
                <ChipRow options={LOGO_FORMATOS} value={draftConfig.logoFormato || 'livre'} onChange={(v) => updateDraft({ logoFormato: v })} colors={colors} accent={accent} />
              </Field>
            ) : null}
          </Card>

          <Card title="Textos do cabeçalho" hint="Por padrão só título e subtítulo. Extra você adiciona ou remove. Cor, tamanho e posição ficam na pré-visualização, ao clicar no texto." colors={colors}>
            <Field label="Título" colors={colors}>
              <TextInput style={inputStyle} value={draftConfig.titulo} onChangeText={(v) => updateDraft({ titulo: v, mostrarTitulo: true })} placeholder="Título da loja" placeholderTextColor={colors.textSecondary} />
            </Field>
            <Field label="Subtítulo" colors={colors}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  value={draftConfig.subtitulo}
                  onChangeText={(v) => updateDraft({ subtitulo: v, mostrarSubtitulo: true })}
                  placeholder="Subtítulo"
                  placeholderTextColor={colors.textSecondary}
                />
                {draftConfig.mostrarSubtitulo !== false ? (
                  <TouchableOpacity onPress={() => { playTapSound(); updateDraft({ mostrarSubtitulo: false }); }} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </Field>
            {draftConfig.usaNomeProfissional === true ? (
              <Field label={rotulos.nomeCampo} colors={colors}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    style={[inputStyle, { flex: 1 }]}
                    value={draftConfig.nomeLoja || ''}
                    onChangeText={(v) => updateDraft({ nomeLoja: v })}
                    placeholder={profile?.empresa || profile?.nome || 'Nome da empresa'}
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity onPress={() => { playTapSound(); updateDraft({ usaNomeProfissional: false }); }} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </Field>
            ) : null}
            {draftConfig.mostrarSlogan === true ? (
              <Field label="Slogan" colors={colors}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    style={[inputStyle, { flex: 1 }]}
                    value={draftConfig.slogan || ''}
                    onChangeText={(v) => updateDraft({ slogan: v })}
                    placeholder="Slogan"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity onPress={() => { playTapSound(); updateDraft({ mostrarSlogan: false }); }} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </Field>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {draftConfig.mostrarSubtitulo === false ? (
                <TouchableOpacity
                  style={[st.linkBtn, { backgroundColor: accent }]}
                  onPress={() => { playTapSound(); updateDraft({ mostrarSubtitulo: true }); }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={st.linkBtnText}>Subtítulo</Text>
                </TouchableOpacity>
              ) : null}
              {draftConfig.usaNomeProfissional !== true ? (
                <TouchableOpacity
                  style={[st.linkBtn, { backgroundColor: accent }]}
                  onPress={() => { playTapSound(); updateDraft({ usaNomeProfissional: true }); }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={st.linkBtnText}>Nome</Text>
                </TouchableOpacity>
              ) : null}
              {draftConfig.mostrarSlogan !== true ? (
                <TouchableOpacity
                  style={[st.linkBtn, { backgroundColor: accent }]}
                  onPress={() => { playTapSound(); updateDraft({ mostrarSlogan: true }); }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={st.linkBtnText}>Slogan</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Field label={rotulos.sobre} colors={colors}>
              <TextInput style={[inputStyle, st.inputMultiline]} value={draftConfig.sobreTexto || ''} onChangeText={(v) => updateDraft({ sobreTexto: v })} multiline placeholder={rotulos.apresentacao} placeholderTextColor={colors.textSecondary} />
            </Field>
          </Card>

          <Card title="Formato do banner" hint="Altura, moldura e sobreposição. Para mover textos, clique neles na pré-visualização." colors={colors}>
            <Field label="Alinhamento dos textos" colors={colors}>
              <ChipRow options={HERO_ALINHAMENTOS} value={draftConfig.heroAlinhamentoTexto || 'centro'} onChange={(v) => updateDraft({ heroAlinhamentoTexto: v })} colors={colors} accent={accent} />
            </Field>
            <Field label="Tamanho do título" colors={colors}>
              <ChipRow options={TITULO_TAMANHOS} value={draftConfig.tituloTamanho || 'medio'} onChange={(v) => updateDraft({ tituloTamanho: v })} colors={colors} accent={accent} />
            </Field>
            <Field label="Altura do cabeçalho" colors={colors}>
              <ChipRow options={HERO_ALTURAS} value={draftConfig.heroAltura || 'normal'} onChange={(v) => updateDraft({ heroAltura: v })} colors={colors} accent={accent} />
            </Field>
            <Field label="Moldura do cabeçalho" colors={colors}>
              <ChipRow options={HERO_MOLDURAS} value={draftConfig.heroMoldura || 'cheia'} onChange={(v) => updateDraft({ heroMoldura: v })} colors={colors} accent={accent} />
            </Field>
            <Field label="Sobreposição na página" colors={colors}>
              <ChipRow options={HERO_SOBREPOSICOES} value={draftConfig.heroSobreposicao || 'nenhuma'} onChange={(v) => updateDraft({ heroSobreposicao: v })} colors={colors} accent={accent} />
            </Field>
          </Card>
        </>
      )}

      {tab === 'vitrine' && (
        <>
          <Card title="O que aparece" colors={colors}>
            <ChipRow options={CATALOGO_TIPOS} value={draftConfig.tipo} onChange={refreshItens} colors={colors} accent={accent} />
            <Field label="Layout" colors={colors}>
              <ChipRow
                options={CATALOGO_LAYOUTS}
                value={draftConfig.layout}
                onChange={(v) => updateDraft({ layout: v, ...(v === 'carrossel' ? { carouselAtivo: true } : {}) })}
                colors={colors}
                accent={accent}
              />
            </Field>
            <Field label="Tamanho dos cards" colors={colors}>
              <ChipRow options={CATALOGO_CARD_SIZES} value={draftConfig.cardSize} onChange={(v) => updateDraft({ cardSize: v })} colors={colors} accent={accent} />
            </Field>
            <Field label="Máximo de itens (0 = todos)" colors={colors}>
              <TextInput style={inputStyle} value={String(draftConfig.maxItensVisiveis || 0)} onChangeText={(v) => updateDraft({ maxItensVisiveis: Math.max(0, parseInt(v.replace(/\D/g, ''), 10) || 0) })} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
            </Field>
            <SwitchLine label="Mostrar preços" value={draftConfig.mostrarPrecos !== false} onValueChange={(v) => updateDraft({ mostrarPrecos: v })} colors={colors} accent={accent} />
            <SwitchLine label="Mostrar promoções" value={draftConfig.mostrarPromocao !== false} onValueChange={(v) => updateDraft({ mostrarPromocao: v })} colors={colors} accent={accent} />
            <SwitchLine label="Carrinho" value={draftConfig.mostrarCarrinho !== false} onValueChange={(v) => updateDraft({ mostrarCarrinho: v })} colors={colors} accent={accent} />
          </Card>

          <Card
            title="Carrossel"
            hint="Pode ser só produtos, só serviços ou os dois. O tamanho, o estilo e a animação valem na pré-visualização e no link público."
            colors={colors}
          >
            <SwitchLine
              label="Mostrar carrossel"
              value={draftConfig.layout === 'carrossel' || draftConfig.carouselAtivo === true}
              onValueChange={(v) => updateDraft({ carouselAtivo: v, ...(v ? {} : { layout: draftConfig.layout === 'carrossel' ? 'vitrine' : draftConfig.layout }) })}
              colors={colors}
              accent={accent}
            />
            <Field label="O que entra no carrossel" colors={colors}>
              <ChipRow options={CAROUSEL_SCOPES} value={draftConfig.carouselScope || 'destaque'} onChange={(v) => updateDraft({ carouselScope: v })} colors={colors} accent={accent} />
            </Field>
            <Field label="Tamanho" colors={colors}>
              <ChipRow options={CAROUSEL_SIZES} value={draftConfig.carouselSize || 'medio'} onChange={(v) => updateDraft({ carouselSize: v })} colors={colors} accent={accent} />
            </Field>
            <Field label="Estilo" colors={colors}>
              <ChipRow options={CAROUSEL_ESTILOS} value={draftConfig.carouselEstilo || 'classico'} onChange={(v) => updateDraft({ carouselEstilo: v })} colors={colors} accent={accent} />
            </Field>
            <Field label="Animação" colors={colors}>
              <ChipRow options={CAROUSEL_ANIMS} value={draftConfig.carouselAnim || 'deslize'} onChange={(v) => updateDraft({ carouselAnim: v })} colors={colors} accent={accent} />
            </Field>
            <Field label="Velocidade automática" colors={colors}>
              <ChipRow options={CAROUSEL_SPEEDS} value={draftConfig.carouselSpeed || 'normal'} onChange={(v) => updateDraft({ carouselSpeed: v })} colors={colors} accent={accent} />
            </Field>
            <SwitchLine label="Carrossel automático" value={draftConfig.carouselAuto !== false} onValueChange={(v) => updateDraft({ carouselAuto: v })} colors={colors} accent={accent} />
          </Card>

          <Card title="Categorias" colors={colors}>
            <ProductCategoriesEditor value={draftConfig.categoriasProdutos} onChange={(next) => updateDraft({ categoriasProdutos: next })} colors={colors} accent={accent} compact />
          </Card>

          <Card title="Ordem e visibilidade" hint="O lápis edita foto, nome e preço no cadastro do app." colors={colors}>
            {itemRows.map((row, idx) => (
              <View key={row._key} style={[st.itemRow, { borderColor: colors.border, backgroundColor: colors.bg, opacity: row.visible === false ? 0.5 : 1 }]}>
                <Ionicons name={row.tipo === 'servico' ? 'construct-outline' : 'cube-outline'} size={18} color={accent} />
                <Text style={[st.itemName, { color: colors.text }]} numberOfLines={1}>{row.name}</Text>
                {onEditItem ? (
                  <TouchableOpacity onPress={() => onEditItem(row)} hitSlop={8}>
                    <Ionicons name="pencil" size={18} color={accent} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={() => updateDraft({ itens: toggleCatalogoItemVisible(draftConfig.itens, row._key) })} hitSlop={8}>
                  <Ionicons name={row.visible !== false ? 'eye' : 'eye-off'} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => updateDraft({ itens: moveCatalogoItem(draftConfig.itens, row._key, 'up') })} disabled={idx === 0} hitSlop={8}>
                  <Ionicons name="chevron-up" size={20} color={idx === 0 ? colors.border : colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => updateDraft({ itens: moveCatalogoItem(draftConfig.itens, row._key, 'down') })} disabled={idx === itemRows.length - 1} hitSlop={8}>
                  <Ionicons name="chevron-down" size={20} color={idx === itemRows.length - 1 ? colors.border : colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        </>
      )}

      {tab === 'pedidos' && (
        <>
          <Card
            title="Link público"
            hint="O endereço fica no próprio site: tudocerto-web.vercel.app/seu-nome. Sem deploy novo para cada loja. Quem abre o link não precisa de cadastro."
            colors={colors}
          >
            {!canPublishPublicStore ? (
              <Text style={[st.hint, { color: colors.textSecondary }]}>
                O link único da loja entra no plano Pro empresa. Você precisa de cadastro e assinatura; seus clientes não.
              </Text>
            ) : null}
            <Field label="Nome no link" colors={colors}>
              <View style={st.slugRow}>
                <Text style={[st.slugPrefix, { color: colors.textSecondary }]} numberOfLines={1}>
                  {LOJA_DEFAULT_HOST}/
                </Text>
                <TextInput
                  style={[inputStyle, st.slugInput]}
                  value={draftConfig.slugPublico || ''}
                  editable={canPublishPublicStore}
                  onChangeText={(v) => updateDraft({ slugPublico: v.replace(/\s/g, '').toLowerCase() })}
                  onBlur={() => {
                    const n = normalizeLojaSlug(draftConfig.slugPublico);
                    updateDraft({ slugPublico: n });
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="minhaloja"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </Field>
            {canPublishPublicStore && slugCheck.message ? (
              <Text
                style={[
                  st.hint,
                  {
                    color: slugCheck.status === 'available'
                      ? '#16A34A'
                      : slugCheck.status === 'taken' || slugCheck.status === 'invalid'
                        ? '#DC2626'
                        : colors.textSecondary,
                    fontWeight: '800',
                  },
                ]}
              >
                {slugCheck.message}
              </Text>
            ) : null}
            <Text style={[st.hint, { color: colors.textSecondary }]}>
              Letras, números e hífen. Mínimo 3 caracteres. Ex.: lojaballcher
            </Text>
            {ownerUserId ? (
              <Text style={[st.linkPreview, { color: colors.text, borderColor: colors.border }]} selectable>
                {buildLojaPublicUrl(ownerUserId, draftConfig)}
              </Text>
            ) : null}
            <View style={st.linkActions}>
              <TouchableOpacity style={[st.linkBtn, { backgroundColor: accent }]} onPress={onCopyLink} disabled={!ownerUserId}>
                <Ionicons name="copy-outline" size={18} color="#fff" />
                <Text style={st.linkBtnText}>Copiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.linkBtn, { backgroundColor: '#25D366' }]} onPress={onShareLink} disabled={!ownerUserId}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
                <Text style={st.linkBtnText}>Compartilhar</Text>
              </TouchableOpacity>
            </View>
            <SwitchLine label={rotulos.publicoAtivo} value={draftConfig.lojaPublica !== false} onValueChange={(v) => updateDraft({ lojaPublica: v })} colors={colors} accent={accent} />
          </Card>

          <Card title="WhatsApp" hint="Número que recebe o pedido. Vazio usa o telefone do perfil." colors={colors}>
            <TextInput style={inputStyle} value={draftConfig.whatsappPedido || ''} onChangeText={(v) => updateDraft({ whatsappPedido: v })} placeholder={profile?.telefone || '(11) 99999-9999'} placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />
          </Card>

          <Card title="Agendamento online" hint="O cliente vê horários livres e agenda no mesmo pedido." colors={colors}>
            <SwitchLine label="Permitir agendamento" value={draftConfig.agendamentoOnline !== false} onValueChange={(v) => updateDraft({ agendamentoOnline: v })} colors={colors} accent={accent} />
            <Field label="Horário de atendimento" colors={colors}>
              <View style={st.timeRow}>
                <TextInput style={[inputStyle, st.timeInput]} value={draftConfig.agendaHoraInicio || '08:00'} onChangeText={(v) => updateDraft({ agendaHoraInicio: v })} placeholder="08:00" />
                <Text style={{ color: colors.textSecondary }}>até</Text>
                <TextInput style={[inputStyle, st.timeInput]} value={draftConfig.agendaHoraFim || '18:00'} onChangeText={(v) => updateDraft({ agendaHoraFim: v })} placeholder="18:00" />
              </View>
            </Field>
            <Field label="Intervalo entre horários (min)" colors={colors}>
              <TextInput style={inputStyle} value={String(draftConfig.agendaIntervaloMin || 30)} onChangeText={(v) => updateDraft({ agendaIntervaloMin: Math.max(15, parseInt(v.replace(/\D/g, ''), 10) || 30) })} keyboardType="number-pad" />
            </Field>
            <Field label="Duração do atendimento (min)" colors={colors}>
              <TextInput style={inputStyle} value={String(draftConfig.agendaDuracaoMin || 60)} onChangeText={(v) => updateDraft({ agendaDuracaoMin: Math.max(15, parseInt(v.replace(/\D/g, ''), 10) || 60) })} keyboardType="number-pad" />
            </Field>
          </Card>
        </>
      )}

      <TouchableOpacity style={[st.saveBtn, { backgroundColor: colors.primary }]} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.saveBtnText}>{rotulos.salvar}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 36 },
  linkBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  linkText: { flex: 1, fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 4, marginBottom: 12, gap: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 8, borderRadius: 10 },
  tabText: { fontSize: 10, fontWeight: '800' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  hint: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  headerTextBlock: { gap: 8 },
  headerEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  headerEditLabel: { fontSize: 11, fontWeight: '700' },
  headerEditGap: { width: 1, height: 22, backgroundColor: 'rgba(148,163,184,0.45)' },
  headerShow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerFontBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, borderWidth: 1, maxWidth: 140 },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  estiloGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  estiloCard: { width: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetCard: { width: '31%', flexGrow: 1, minWidth: 92, borderWidth: 2, borderRadius: 14, padding: 10, gap: 4 },
  presetBar: { height: 6, borderRadius: 4, marginBottom: 4 },
  gradGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gradCard: { width: '48%', flexGrow: 1, borderRadius: 14, overflow: 'hidden' },
  gradFill: { height: 64, justifyContent: 'flex-end', padding: 8 },
  gradLabel: { color: '#fff', fontWeight: '800', fontSize: 13 },
  darkCard: { width: '48%', flexGrow: 1, borderRadius: 14, borderWidth: 2, padding: 12, minHeight: 72, justifyContent: 'flex-end', gap: 8 },
  darkDot: { width: 18, height: 18, borderRadius: 9 },
  multiPreview: { height: 54, borderRadius: 12, marginBottom: 10 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  slot: { width: 42, height: 42, borderRadius: 12, borderWidth: 3 },
  slotRemove: { position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  slotAdd: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, borderWidth: 1 },
  uploadImg: { width: 52, height: 52, borderRadius: 26 },
  uploadPh: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  switchLabel: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '600' },
  saveBtn: { marginTop: 4, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  linkPreview: { fontSize: 12, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  slugRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  slugPrefix: { fontSize: 13, fontWeight: '600' },
  slugInput: { flexGrow: 1, minWidth: 120, marginTop: 0 },
  linkActions: { flexDirection: 'row', gap: 8 },
  linkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  linkBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { flex: 1, textAlign: 'center' },
  heroMiniPreview: { marginTop: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  heroMiniInner: { padding: 14 },
  heroMiniTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
