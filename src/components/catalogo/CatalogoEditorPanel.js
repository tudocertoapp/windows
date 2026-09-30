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
import { playTapSound } from '../../utils/sounds';
import { ProductCategoriesEditor } from './ProductCategoriesEditor';
import { CatalogoColorBrush } from './CatalogoColorBrush';
import { CatalogoGradientControls } from './CatalogoGradientControls';
import { CatalogoGradientStops } from './CatalogoGradientStops';
import { normalizeGradientStops } from '../../utils/catalogoGradient';
import { CatalogoSizeStepper } from './CatalogoSizeStepper';
import { ensureCatalogoFonts } from '../../utils/catalogoFonts';
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
  CAROUSEL_POSICOES,
  CAROUSEL_VISIVEIS,
  LOGO_TAMANHOS,
  LOGO_MOLDURAS,
  LOGO_EFEITOS,
  LOGO_FUNDO_IMG,
  HERO_ALINHAMENTOS,
  TITULO_TAMANHOS,
  HERO_ALTURAS,
  HERO_MOLDURAS,
  HERO_SOBREPOSICOES,
  TEMAS_ESCUROS,
  TEMAS_PRONTOS,
  applyTemaPronto,
  snapshotTemaAtual,
  applyTemaSalvo,
  upsertTemaSalvo,
  removeTemaSalvo,
  TEMAS_SALVOS_MAX,
  TEMA_ESTILOS,
  FUNDO_ESTILOS,
  buildHeroPresentation,
  getCatalogoTheme,
  getCatalogoPageBg,
  getCatalogoRotulos,
  ROTULO_VITRINE_OPTS,
  syncCatalogoItens,
  itemKey,
  normalizeCarouselItemIds,
  moveCatalogoItem,
  toggleCatalogoItemVisible,
  getLojaLogoUri,
  normalizeCoresTema,
  normalizeCoresFundo,
  getCatalogoImageHints,
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
  onOpenStore,
  onShareLink,
  onEditItem,
  onOpenPreview,
  canPublishPublicStore = false,
}) {
  const [tab, setTab] = useState('visual');
  const [colorSlot, setColorSlot] = useState(0);
  const [fundoSlot, setFundoSlot] = useState(0);
  const [temaNome, setTemaNome] = useState('');
  const [slugCheck, setSlugCheck] = useState({ status: 'idle', message: '' });
  const accent = draftConfig.corPrincipal || colors.primary;
  const theme = getCatalogoTheme(draftConfig);
  const pageBg = getCatalogoPageBg(draftConfig);
  const rotulos = getCatalogoRotulos(draftConfig);
  const estilo = theme.estilo;
  const imgHints = getCatalogoImageHints(draftConfig);

  useEffect(() => {
    ensureCatalogoFonts(draftConfig);
  }, [draftConfig?.fontesUsuario]);

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
        gradienteStops: normalizeGradientStops(draftConfig.gradienteStops, pack),
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

  const setCorAt = (index, cor) => {
    if (!cor) return;
    const cores = normalizeCoresTema(draftConfig);
    const next = [...cores];
    const idx = Math.min(Math.max(0, index), next.length - 1);
    setColorSlot(idx);
    next[idx] = cor;
    updateDraft({
      temaEstilo: estilo === 'solido' ? 'solido' : (estilo === 'escuro' ? 'escuro' : 'gradiente'),
      coresTema: estilo === 'solido' ? [cor] : next,
      corPrincipal: estilo === 'solido' ? cor : next[0],
    });
  };

  const setCorSlot = (cor) => setCorAt(colorSlot, cor);

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

  const applyFundoEstilo = (next) => {
    if (next === pageBg.estilo) return;
    const cores = normalizeCoresFundo(draftConfig);
    if (next === 'solido') {
      const cor = cores[0];
      updateDraft({
        fundoEstilo: 'solido',
        corFundo: cor,
        coresFundo: [cor],
        corTexto: draftConfig.corTexto || '#0f172a',
      });
      return;
    }
    const pack = cores.length >= 2 ? cores : [cores[0], '#e2e8f0'];
    setFundoSlot(0);
    updateDraft({
      fundoEstilo: 'gradiente',
      coresFundo: pack,
      corFundo: pack[0],
      fundoGradienteDirecao: draftConfig.fundoGradienteDirecao || 'diagonal',
      corTexto: draftConfig.corTexto || '#0f172a',
      fundoGradienteStops: normalizeGradientStops(draftConfig.fundoGradienteStops, pack),
    });
  };

  const setFundoCorAt = (index, cor) => {
    if (!cor) return;
    const cores = normalizeCoresFundo(draftConfig);
    if (pageBg.estilo === 'solido') {
      updateDraft({ fundoEstilo: 'solido', corFundo: cor, coresFundo: [cor], corTexto: draftConfig.corTexto || '#0f172a' });
      return;
    }
    const next = [...cores];
    const idx = Math.min(Math.max(0, index), Math.max(0, next.length - 1));
    setFundoSlot(idx);
    next[idx] = cor;
    updateDraft({
      fundoEstilo: 'gradiente',
      coresFundo: next,
      corFundo: next[0],
      corTexto: draftConfig.corTexto || '#0f172a',
    });
  };

  const setFundoCorSlot = (cor) => setFundoCorAt(fundoSlot, cor);

  const addFundoCor = () => {
    const cores = normalizeCoresFundo(draftConfig);
    if (cores.length >= 4) return;
    const next = [...cores, '#cbd5e1'];
    setFundoSlot(next.length - 1);
    updateDraft({ fundoEstilo: 'gradiente', coresFundo: next, corFundo: next[0] });
  };

  const removeFundoCor = (index) => {
    const cores = normalizeCoresFundo(draftConfig);
    if (cores.length <= 2) return;
    const next = cores.filter((_, i) => i !== index);
    setFundoSlot(Math.max(0, index - 1));
    updateDraft({ coresFundo: next, corFundo: next[0] });
  };

  const refreshItens = (tipo) => {
    const next = { ...draftConfig, tipo };
    updateDraft({ tipo, itens: syncCatalogoItens(next, products, services) });
  };

  const logoUri = getLojaLogoUri(draftConfig, profile, { forEdit: true });
  useMemo(() => buildHeroPresentation(draftConfig), [draftConfig]);
  const inputStyle = [st.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }];

  return (
    <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={[st.linkBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="link-outline" size={18} color={accent} />
        <TouchableOpacity onPress={onOpenStore} disabled={!ownerUserId} style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.linkText, { color: colors.text }]} numberOfLines={1}>
            {lojaUrl || rotulos.linkHint}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenStore} disabled={!ownerUserId} hitSlop={8}>
          <Ionicons name="open-outline" size={18} color={accent} />
        </TouchableOpacity>
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

          <Card
            title="Meus temas"
            hint="Salva o visual atual (cores, degradê, fontes e efeitos). Toque num tema salvo para aplicar. O nome repetido substitui o anterior."
            colors={colors}
          >
            <TextInput
              style={inputStyle}
              value={temaNome}
              onChangeText={setTemaNome}
              placeholder="Nome do tema"
              placeholderTextColor={colors.textSecondary}
              maxLength={40}
            />
            <TouchableOpacity
              onPress={() => {
                playTapSound();
                const lista = Array.isArray(draftConfig.temasSalvos) ? draftConfig.temasSalvos : [];
                if (lista.length >= TEMAS_SALVOS_MAX && !lista.some((t) => String(t.nome || '').trim().toLowerCase() === String(temaNome || '').trim().toLowerCase())) {
                  return;
                }
                const snap = snapshotTemaAtual(draftConfig, temaNome || `Meu tema ${lista.length + 1}`);
                updateDraft(upsertTemaSalvo(draftConfig, snap));
                setTemaNome('');
              }}
              style={[st.saveTemaBtn, { backgroundColor: accent }]}
            >
              <Ionicons name="bookmark-outline" size={16} color="#fff" />
              <Text style={st.saveTemaText}>Salvar tema atual</Text>
            </TouchableOpacity>
            {(draftConfig.temasSalvos || []).length ? (
              <View style={[st.presetGrid, { marginTop: 12 }]}>
                {(draftConfig.temasSalvos || []).map((t) => {
                  const on = (draftConfig.temaPronto || '') === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => { playTapSound(); updateDraft(applyTemaSalvo(t)); }}
                      style={[st.presetCard, { borderColor: on ? (t.corPrincipal || accent) : colors.border, backgroundColor: t.corFundo || colors.bg }]}
                    >
                      <View style={[st.presetBar, { backgroundColor: t.corPrincipal || accent }]} />
                      <Text style={{ color: t.corTexto || colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{t.nome}</Text>
                      <Text style={{ color: t.corTexto || colors.text, opacity: 0.65, fontSize: 10, fontWeight: '600' }}>Salvo</Text>
                      <TouchableOpacity
                        onPress={() => { playTapSound(); updateDraft(removeTemaSalvo(draftConfig, t.id)); }}
                        hitSlop={8}
                        style={st.temaTrash}
                      >
                        <Ionicons name="trash-outline" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={[st.hint, { color: colors.textSecondary, marginTop: 8, marginBottom: 0 }]}>
                Nenhum tema salvo ainda. Ajuste as cores e toque em salvar.
              </Text>
            )}
            {(draftConfig.temasSalvos || []).length >= TEMAS_SALVOS_MAX ? (
              <Text style={[st.hint, { color: colors.textSecondary, marginTop: 8, marginBottom: 0 }]}>
                Limite de {TEMAS_SALVOS_MAX} temas. O mais antigo sai se você salvar outro.
              </Text>
            ) : null}
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
            <Card title="Gradiente" hint="Clique na barra para criar cores. Arraste as setas e o losango para puxar a intensidade para um lado — como no Photoshop." colors={colors}>
              <CatalogoGradientStops
                stops={theme.stops}
                cores={theme.cores}
                look={theme.look}
                onChange={(stops) => updateDraft({
                  temaEstilo: 'gradiente',
                  gradienteStops: stops,
                  coresTema: stops.map((s) => s.cor),
                  corPrincipal: stops[0]?.cor || draftConfig.corPrincipal,
                })}
                colors={colors}
                accent={accent}
              />
              <Field label="Degradê" colors={colors}>
                <CatalogoGradientControls
                  look={theme.look}
                  onChange={(look) => updateDraft({
                    gradienteForma: look.forma,
                    gradienteAngulo: look.angulo,
                    gradienteInverter: look.inverter,
                  })}
                  colors={colors}
                  accent={accent}
                />
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

          <Card title="Fundo da página" hint="Sólido usa uma cor. Gradiente usa várias, do mesmo jeito que o cabeçalho." colors={colors}>
            <View style={st.estiloGrid}>
              {FUNDO_ESTILOS.map((item) => {
                const on = pageBg.estilo === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => { playTapSound(); applyFundoEstilo(item.id); }}
                    style={[st.estiloCard, { borderColor: on ? accent : colors.border, backgroundColor: on ? accent + '14' : colors.bg }]}
                  >
                    <Ionicons name={item.icon} size={18} color={on ? accent : colors.textSecondary} />
                    <Text style={{ color: on ? accent : colors.text, fontWeight: '700', fontSize: 12 }}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {pageBg.estilo === 'solido' ? (
              <CatalogoColorBrush
                label="Cor de fundo da vitrine"
                value={pageBg.solid}
                onChange={setFundoCorSlot}
                colors={colors}
                accent={accent}
              />
            ) : (
              <>
                <CatalogoGradientStops
                  stops={pageBg.stops}
                  cores={pageBg.cores}
                  look={pageBg.look}
                  onChange={(stops) => updateDraft({
                    fundoEstilo: 'gradiente',
                    fundoGradienteStops: stops,
                    coresFundo: stops.map((s) => s.cor),
                    corFundo: stops[0]?.cor || draftConfig.corFundo,
                    corTexto: draftConfig.corTexto || '#0f172a',
                  })}
                  colors={colors}
                  accent={accent}
                />
                <Field label="Degradê" colors={colors}>
                  <CatalogoGradientControls
                    look={pageBg.look}
                    onChange={(look) => updateDraft({
                      fundoGradienteForma: look.forma,
                      fundoGradienteAngulo: look.angulo,
                      fundoGradienteInverter: look.inverter,
                    })}
                    colors={colors}
                    accent={accent}
                  />
                </Field>
              </>
            )}
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
              <Text style={[st.hint, { color: colors.textSecondary, marginTop: 8, marginBottom: 0 }]}>
                Tamanho ideal do banner: {imgHints.banner}. Recorte paisagem para preencher o cabeçalho sem distorcer.
              </Text>
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
          <Card title="Logo" hint="Em Logo transparente o fundo sólido (branco/cinza) vira transparência de verdade. Sem moldura e sem placa atrás." colors={colors}>
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
                <Text style={[st.hint, { color: colors.textSecondary, marginBottom: 0, marginTop: 2 }]}>Tamanho ideal: {imgHints.logo}.</Text>
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
            <Field label="Tamanho" colors={colors}>
              <ChipRow options={LOGO_TAMANHOS} value={draftConfig.logoTamanho || 'medio'} onChange={(v) => updateDraft({ logoTamanho: v })} colors={colors} accent={accent} />
            </Field>
            <Field label="Moldura" colors={colors}>
              <ChipRow
                options={LOGO_MOLDURAS}
                value={draftConfig.logoMoldura || 'circular'}
                onChange={(v) => updateDraft({ logoMoldura: v, logoPlaca: v === 'nenhuma' ? false : draftConfig.logoPlaca, logoSemMoldura: v === 'nenhuma' })}
                colors={colors}
                accent={accent}
              />
            </Field>
            <SwitchLine
              label="Fundo atrás da logo"
              value={!!draftConfig.logoPlaca}
              onValueChange={(v) => updateDraft({ logoPlaca: v })}
              colors={colors}
              accent={accent}
            />
            {draftConfig.logoPlaca ? (
              <CatalogoColorBrush
                compact
                label="Cor do fundo da logo"
                value={draftConfig.logoPlacaCor || '#ffffff'}
                onChange={(c) => updateDraft({ logoPlacaCor: c })}
                colors={colors}
                accent={accent}
              />
            ) : null}
            <CatalogoColorBrush
              compact
              label="Cor da logo"
              value={draftConfig.logoCor || '#ffffff'}
              onChange={(c) => updateDraft({ logoCor: c })}
              colors={colors}
              accent={accent}
            />
            <SwitchLine
              label="Inverter cores da logo"
              value={!!draftConfig.logoInverter}
              onValueChange={(v) => updateDraft({ logoInverter: v })}
              colors={colors}
              accent={accent}
            />
            <Field label="Fundo da imagem" colors={colors}>
              <ChipRow
                options={LOGO_FUNDO_IMG}
                value={draftConfig.logoFundoImg || 'manter'}
            onChange={(v) => updateDraft({
              logoFundoImg: v,
              ...(v !== 'manter' ? { logoPlaca: false, logoMoldura: 'nenhuma', logoSemMoldura: true } : {}),
            })}
                colors={colors}
                accent={accent}
              />
            </Field>
            <Field label="Efeito" colors={colors}>
              <ChipRow
                options={LOGO_EFEITOS}
                value={draftConfig.logoEfeito || 'nenhum'}
                onChange={(v) => updateDraft({ logoEfeito: v })}
                colors={colors}
                accent={accent}
              />
            </Field>
          </Card>

          <Card title="Textos do cabeçalho" hint="Nome, slogan e descrição. Use Adicionar na pré-visualização para criar mais textos no banner." colors={colors}>
            {draftConfig.usaNomeProfissional === true ? (
              <Field label={rotulos.nomeCampo} colors={colors}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    style={[inputStyle, { flex: 1 }]}
                    value={draftConfig.nomeLoja || ''}
                    onChangeText={(v) => updateDraft({ nomeLoja: v, usaNomeProfissional: true })}
                    placeholder={profile?.empresa || profile?.nome || 'Nome da loja'}
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity onPress={() => { playTapSound(); updateDraft({ usaNomeProfissional: false }); }} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <CatalogoSizeStepper
                  compact
                  value={draftConfig.nomeEscala ?? 100}
                  onChange={(v) => updateDraft({ nomeEscala: v })}
                  colors={colors}
                  accent={accent}
                />
              </Field>
            ) : null}
            {draftConfig.mostrarSlogan === true ? (
              <Field label="Slogan" colors={colors}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    style={[inputStyle, { flex: 1 }]}
                    value={draftConfig.slogan || ''}
                    onChangeText={(v) => updateDraft({ slogan: v, mostrarSlogan: true })}
                    placeholder="Slogan"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity onPress={() => { playTapSound(); updateDraft({ mostrarSlogan: false }); }} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </Field>
            ) : null}
            {draftConfig.mostrarSobre !== false ? (
              <Field label="Descrição" colors={colors}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <TextInput
                    style={[inputStyle, st.inputMultiline, { flex: 1 }]}
                    value={draftConfig.sobreTexto || ''}
                    onChangeText={(v) => updateDraft({ sobreTexto: v, mostrarSobre: true })}
                    multiline
                    placeholder={rotulos.apresentacao}
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity onPress={() => { playTapSound(); updateDraft({ mostrarSobre: false }); }} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </Field>
            ) : null}
            {draftConfig.mostrarTitulo === true ? (
              <Field label="Título" colors={colors}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    style={[inputStyle, { flex: 1 }]}
                    value={draftConfig.titulo}
                    onChangeText={(v) => updateDraft({ titulo: v, mostrarTitulo: true })}
                    placeholder="Título"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity onPress={() => { playTapSound(); updateDraft({ mostrarTitulo: false }); }} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </Field>
            ) : null}
            {draftConfig.mostrarSubtitulo === true ? (
              <Field label="Subtítulo" colors={colors}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    style={[inputStyle, { flex: 1 }]}
                    value={draftConfig.subtitulo}
                    onChangeText={(v) => updateDraft({ subtitulo: v, mostrarSubtitulo: true })}
                    placeholder="Subtítulo"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity onPress={() => { playTapSound(); updateDraft({ mostrarSubtitulo: false }); }} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </Field>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {draftConfig.usaNomeProfissional !== true ? (
                <TouchableOpacity style={[st.linkBtn, { backgroundColor: accent }]} onPress={() => { playTapSound(); updateDraft({ usaNomeProfissional: true }); }}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={st.linkBtnText}>Nome da loja</Text>
                </TouchableOpacity>
              ) : null}
              {draftConfig.mostrarSlogan !== true ? (
                <TouchableOpacity style={[st.linkBtn, { backgroundColor: accent }]} onPress={() => { playTapSound(); updateDraft({ mostrarSlogan: true }); }}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={st.linkBtnText}>Slogan</Text>
                </TouchableOpacity>
              ) : null}
              {draftConfig.mostrarSobre === false ? (
                <TouchableOpacity style={[st.linkBtn, { backgroundColor: accent }]} onPress={() => { playTapSound(); updateDraft({ mostrarSobre: true }); }}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={st.linkBtnText}>Descrição</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Card>

          <Card title="Formato do banner" hint="Altura, moldura e recorte na base do cabeçalho. Para mover textos, clique neles na pré-visualização." colors={colors}>
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
            <Field label="Recorte do cabeçalho" colors={colors}>
              <ChipRow options={HERO_SOBREPOSICOES} value={draftConfig.heroSobreposicao || 'nenhuma'} onChange={(v) => updateDraft({ heroSobreposicao: v })} colors={colors} accent={accent} />
            </Field>
          </Card>
        </>
      )}

      {tab === 'vitrine' && (
        <>
          <Card title="O que aparece" colors={colors}>
            <ChipRow options={CATALOGO_TIPOS} value={draftConfig.tipo} onChange={refreshItens} colors={colors} accent={accent} />
            <Field label="Formato do catálogo" colors={colors}>
              <ChipRow
                options={CATALOGO_LAYOUTS}
                value={draftConfig.layout === 'carrossel' ? 'vitrine' : draftConfig.layout}
                onChange={(v) => updateDraft({
                  layout: v,
                  ...(v === 'landing' ? { heroPosicaoManual: false, heroAlinhamentoTexto: 'centro' } : {}),
                })}
                colors={colors}
                accent={accent}
              />
            </Field>
            <Text style={[st.hint, { color: colors.textSecondary, marginTop: 8, marginBottom: 0 }]}>
              Grade, linha horizontal e lista valem só para o catálogo. O carrossel liga e desliga à parte, abaixo.
            </Text>
            {draftConfig.layout === 'landing' ? (
              <Text style={[st.hint, { color: colors.textSecondary, marginTop: 8 }]}>
                Landing empilha o cabeçalho no estilo celular e a vitrine vira uma página vertical.
              </Text>
            ) : null}
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
            hint="Independente da grade. Pode ligar o carrossel e, ao mesmo tempo, usar grade, linha horizontal ou lista."
            colors={colors}
          >
            <SwitchLine
              label="Mostrar carrossel"
              value={draftConfig.carouselAtivo === true}
              onValueChange={(v) => updateDraft({ carouselAtivo: v })}
              colors={colors}
              accent={accent}
            />
            {draftConfig.carouselAtivo === true ? (
              <>
              <Field label="Posição do carrossel" colors={colors}>
                <ChipRow
                  options={CAROUSEL_POSICOES}
                  value={draftConfig.carouselPosicao || 'acima'}
                  onChange={(v) => updateDraft({ carouselPosicao: v })}
                  colors={colors}
                  accent={accent}
                />
              </Field>
              <Field label="Produtos visíveis" colors={colors}>
                <ChipRow
                  options={CAROUSEL_VISIVEIS}
                  value={String(draftConfig.carouselVisiveis || '1')}
                  onChange={(v) => updateDraft({ carouselVisiveis: v })}
                  colors={colors}
                  accent={accent}
                />
              </Field>
            <Field label="O que entra no carrossel" colors={colors}>
              <ChipRow options={CAROUSEL_SCOPES} value={draftConfig.carouselScope || 'destaque'} onChange={(v) => updateDraft({ carouselScope: v })} colors={colors} accent={accent} />
            </Field>
            {draftConfig.carouselScope === 'escolher' ? (
              <View style={{ marginTop: 10 }}>
                <Text style={[st.hint, { color: colors.textSecondary }]}>
                  Marque os produtos ou serviços. A ordem da lista é a ordem do carrossel. Na pré-visualização, o recorte na foto ajusta a capa.
                </Text>
                {(() => {
                  const ids = normalizeCarouselItemIds(draftConfig.carouselItemIds);
                  return itemRows.filter((row) => row.visible !== false).map((row) => {
                  const on = ids.includes(row._key);
                  const pos = on ? ids.indexOf(row._key) : -1;
                  return (
                    <View key={row._key} style={[st.itemRow, { borderColor: on ? accent : colors.border, backgroundColor: colors.bg }]}>
                      <TouchableOpacity
                        onPress={() => {
                          playTapSound();
                          updateDraft({
                            carouselItemIds: on ? ids.filter((k) => k !== row._key) : [...ids, row._key],
                          });
                        }}
                        hitSlop={8}
                      >
                        <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? accent : colors.textSecondary} />
                      </TouchableOpacity>
                      <Ionicons name={row.tipo === 'servico' ? 'construct-outline' : 'cube-outline'} size={16} color={accent} />
                      <Text style={[st.itemName, { color: colors.text, flex: 1 }]} numberOfLines={1}>{row.name}</Text>
                      {on ? (
                        <>
                          <TouchableOpacity
                            onPress={() => {
                              if (pos <= 0) return;
                              const next = [...ids];
                              [next[pos - 1], next[pos]] = [next[pos], next[pos - 1]];
                              updateDraft({ carouselItemIds: next });
                            }}
                            hitSlop={8}
                          >
                            <Ionicons name="chevron-up" size={18} color={pos <= 0 ? colors.border : colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              if (pos < 0 || pos >= ids.length - 1) return;
                              const next = [...ids];
                              [next[pos + 1], next[pos]] = [next[pos], next[pos + 1]];
                              updateDraft({ carouselItemIds: next });
                            }}
                            hitSlop={8}
                          >
                            <Ionicons name="chevron-down" size={18} color={pos >= ids.length - 1 ? colors.border : colors.textSecondary} />
                          </TouchableOpacity>
                        </>
                      ) : null}
                    </View>
                  );
                  });
                })()}
              </View>
            ) : null}
            <Field label="Tamanho" colors={colors}>
              <ChipRow options={CAROUSEL_SIZES} value={draftConfig.carouselSize || 'medio'} onChange={(v) => updateDraft({ carouselSize: v })} colors={colors} accent={accent} />
              <Text style={[st.hint, { color: colors.textSecondary, marginTop: 6, marginBottom: 0 }]}>
                Mínimo e Fino deixam o carrossel bem baixo; o produto pode parecer mais distante.
              </Text>
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
            <SwitchLine label="Mostrar preço no carrossel" value={draftConfig.carouselMostrarPreco !== false} onValueChange={(v) => updateDraft({ carouselMostrarPreco: v })} colors={colors} accent={accent} />
            <SwitchLine label="Mostrar quantidade em estoque no carrossel" value={!!draftConfig.carouselMostrarEstoque} onValueChange={(v) => updateDraft({ carouselMostrarEstoque: v })} colors={colors} accent={accent} />
            <SwitchLine
              label="Abrir produto ao clicar (sem adicionar no carrossel)"
              value={draftConfig.carouselCliqueDetalhe !== false}
              onValueChange={(v) => updateDraft({ carouselCliqueDetalhe: v })}
              colors={colors}
              accent={accent}
            />
            {draftConfig.carouselCliqueDetalhe !== false ? (
              <Text style={[st.hint, { color: colors.textSecondary, marginTop: 6, marginBottom: 0 }]}>
                No carrossel some o botão de carrinho. O cliente vê fotos, descrição, estoque (se ativo) e adiciona só na ficha do produto.
              </Text>
            ) : null}
              </>
            ) : null}
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

          <Card title="WhatsApp" hint="Número que recebe o pedido. Vazio usa o telefone do perfil. O ícone fica ao lado do carrinho no topo da loja." colors={colors}>
            <SwitchLine label="Mostrar WhatsApp ao lado do carrinho" value={draftConfig.mostrarWhatsApp !== false} onValueChange={(v) => updateDraft({ mostrarWhatsApp: v })} colors={colors} accent={accent} />
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
  presetCard: { width: '31%', flexGrow: 1, minWidth: 92, borderWidth: 2, borderRadius: 14, padding: 10, gap: 4, position: 'relative' },
  presetBar: { height: 6, borderRadius: 4, marginBottom: 4 },
  saveTemaBtn: {
    marginTop: 8,
    minHeight: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveTemaText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  temaTrash: { position: 'absolute', top: 6, right: 6, padding: 2 },
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
