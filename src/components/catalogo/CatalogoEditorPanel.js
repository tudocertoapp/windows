import React, { useMemo, useState } from 'react';
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
import { HeroMoveDock } from './LojaHeroBanner';
import {
  CATALOGO_LAYOUTS,
  CATALOGO_TIPOS,
  CATALOGO_TEMAS,
  CATALOGO_CARD_SIZES,
  CORES_CATALOGO,
  CORES_FUNDO,
  LOGO_TAMANHOS,
  LOGO_FORMATOS,
  HERO_DISPOSICOES,
  HERO_ALINHAMENTOS,
  TITULO_TAMANHOS,
  HERO_ALTURAS,
  DEFAULT_HERO_POSICOES,
  TEMAS_GRADIENTE,
  TEMAS_ESCUROS,
  GRADIENTE_DIRECOES,
  TEMA_ESTILOS,
  buildHeroPresentation,
  getHeroPosicoes,
  getCatalogoTheme,
  getGradientPoints,
  isHeroElementVisible,
  syncCatalogoItens,
  itemKey,
  moveCatalogoItem,
  toggleCatalogoItemVisible,
  getLojaLogoUri,
  normalizeCoresTema,
  nudgeHeroPos,
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
}) {
  const [tab, setTab] = useState('visual');
  const [heroFocus, setHeroFocus] = useState('titulo');
  const [colorSlot, setColorSlot] = useState(0);
  const accent = draftConfig.corPrincipal || colors.primary;
  const theme = getCatalogoTheme(draftConfig);
  const estilo = theme.estilo;

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
      const tema = CATALOGO_TEMAS.find((t) => t.id === draftConfig.tema) || CATALOGO_TEMAS[0];
      updateDraft({
        temaEstilo: 'solido',
        tema: tema.id,
        corPrincipal: tema.cor,
        coresTema: [tema.cor],
        corFundo: '#f8fafc',
        corTexto: '#0f172a',
      });
      return;
    }
    if (next === 'gradiente') {
      const g = TEMAS_GRADIENTE.find((t) => t.id === draftConfig.tema) || TEMAS_GRADIENTE[0];
      updateDraft({
        temaEstilo: 'gradiente',
        tema: g.id,
        coresTema: g.cores,
        corPrincipal: g.cores[0],
        corFundo: '#f8fafc',
        corTexto: '#0f172a',
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
    const cores = normalizeCoresTema(draftConfig);
    const pack = cores.length >= 2 ? cores : [cores[0], '#a855f7'];
    updateDraft({
      temaEstilo: 'cores',
      coresTema: pack,
      corPrincipal: pack[0],
      corFundo: estilo === 'escuro' ? '#f8fafc' : (draftConfig.corFundo || '#f8fafc'),
      corTexto: estilo === 'escuro' ? '#0f172a' : (draftConfig.corTexto || '#0f172a'),
    });
  };

  const setCorSlot = (cor) => {
    const cores = normalizeCoresTema(draftConfig);
    const next = [...cores];
    const idx = Math.min(colorSlot, next.length - 1);
    next[idx] = cor;
    updateDraft({
      coresTema: next,
      corPrincipal: next[0],
      ...(estilo === 'escuro' ? {} : {}),
    });
  };

  const addCor = () => {
    const cores = normalizeCoresTema(draftConfig);
    if (cores.length >= 4) return;
    const extra = CORES_CATALOGO.find((c) => !cores.includes(c)) || '#0ea5e9';
    const next = [...cores, extra];
    setColorSlot(next.length - 1);
    updateDraft({ temaEstilo: 'cores', coresTema: next, corPrincipal: next[0] });
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
  const heroPreview = useMemo(() => buildHeroPresentation(draftConfig), [draftConfig]);
  const inputStyle = [st.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }];
  const points = getGradientPoints(draftConfig.gradienteDirecao);

  return (
    <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={[st.linkBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="link-outline" size={18} color={accent} />
        <Text style={[st.linkText, { color: colors.text }]} numberOfLines={1}>
          {lojaUrl || 'Salve o catálogo para gerar o link'}
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
          <Card title="Estilo do tema" hint="Escolha um visual pronto ou monte o seu. A pré-visualização ao lado atualiza na hora." colors={colors}>
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
              <ChipRow options={CATALOGO_TEMAS} value={draftConfig.tema} onChange={(id) => {
                const tema = CATALOGO_TEMAS.find((t) => t.id === id);
                updateDraft({ tema: id, temaEstilo: 'solido', corPrincipal: tema?.cor || accent, coresTema: [tema?.cor || accent] });
              }} colors={colors} accent={accent} />
              <Field label="Cor principal" colors={colors}>
                <View style={st.colorRow}>
                  {CORES_CATALOGO.map((c) => (
                    <TouchableOpacity key={c} onPress={() => { playTapSound(); updateDraft({ corPrincipal: c, coresTema: [c] }); }} style={[st.colorDot, { backgroundColor: c, borderWidth: draftConfig.corPrincipal === c ? 3 : 0, borderColor: '#fff' }]} />
                  ))}
                </View>
              </Field>
            </Card>
          )}

          {estilo === 'gradiente' && (
            <Card title="Gradiente" hint="O cabeçalho da loja usa essas cores em degradê." colors={colors}>
              <View style={st.gradGrid}>
                {TEMAS_GRADIENTE.map((g) => {
                  const on = draftConfig.tema === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => {
                        playTapSound();
                        updateDraft({ tema: g.id, temaEstilo: 'gradiente', coresTema: g.cores, corPrincipal: g.cores[0] });
                      }}
                      style={[st.gradCard, { borderColor: on ? '#fff' : 'transparent', borderWidth: 2 }]}
                    >
                      <LinearGradient colors={g.cores} start={points.start} end={points.end} style={st.gradFill}>
                        <Text style={st.gradLabel}>{g.label}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
              <Field label="Cor dos botões" colors={colors}>
                <View style={st.colorRow}>
                  {CORES_CATALOGO.map((c) => (
                    <TouchableOpacity key={c} onPress={() => { playTapSound(); updateDraft({ corPrincipal: c, coresTema: [c] }); }} style={[st.colorDot, { backgroundColor: c, borderWidth: accent === c ? 3 : 0, borderColor: '#fff' }]} />
                  ))}
                </View>
              </Field>
            </Card>
          )}

          {estilo === 'cores' && (
            <Card title="Tema com várias cores" hint="Toque numa faixa e escolha a cor. Até 4 cores formam o degradê do cabeçalho." colors={colors}>
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
              <View style={st.colorRow}>
                {CORES_CATALOGO.map((c) => (
                  <TouchableOpacity key={c} onPress={() => { playTapSound(); setCorSlot(c); }} style={[st.colorDot, { backgroundColor: c, borderWidth: theme.cores[colorSlot] === c ? 3 : 0, borderColor: '#fff' }]} />
                ))}
              </View>
              <Field label="Direção do degradê" colors={colors}>
                <ChipRow options={GRADIENTE_DIRECOES} value={draftConfig.gradienteDirecao || 'diagonal'} onChange={(v) => updateDraft({ gradienteDirecao: v })} colors={colors} accent={accent} />
              </Field>
            </Card>
          )}

          <Card title="Fundo da página" colors={colors}>
            <View style={st.colorRow}>
              {CORES_FUNDO.map((c) => (
                <TouchableOpacity key={c} onPress={() => {
                  playTapSound();
                  const escurecer = c === '#0f172a';
                  updateDraft({
                    corFundo: c,
                    ...(escurecer
                      ? { corTexto: '#f8fafc', temaEstilo: 'escuro' }
                      : estilo === 'escuro'
                        ? { temaEstilo: 'solido', corTexto: '#0f172a' }
                        : {}),
                  });
                }} style={[st.colorDot, { backgroundColor: c, borderWidth: draftConfig.corFundo === c ? 3 : 1, borderColor: draftConfig.corFundo === c ? accent : colors.border }]} />
              ))}
            </View>
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
            <SwitchLine label="Mostrar logo" value={draftConfig.usaLogo !== false} onValueChange={(v) => updateDraft({ usaLogo: v })} colors={colors} accent={accent} />
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

          <Card title="Textos" colors={colors}>
            <Field label="Nome da loja" colors={colors}>
              <TextInput style={inputStyle} value={draftConfig.nomeLoja || ''} onChangeText={(v) => updateDraft({ nomeLoja: v })} placeholder={profile?.empresa || profile?.nome || 'Nome da empresa'} placeholderTextColor={colors.textSecondary} />
            </Field>
            <Field label="Título" colors={colors}>
              <TextInput style={inputStyle} value={draftConfig.titulo} onChangeText={(v) => updateDraft({ titulo: v })} placeholderTextColor={colors.textSecondary} />
            </Field>
            <Field label="Subtítulo" colors={colors}>
              <TextInput style={inputStyle} value={draftConfig.subtitulo} onChangeText={(v) => updateDraft({ subtitulo: v })} placeholderTextColor={colors.textSecondary} />
            </Field>
            <Field label="Slogan" colors={colors}>
              <TextInput style={inputStyle} value={draftConfig.slogan || ''} onChangeText={(v) => updateDraft({ slogan: v })} placeholderTextColor={colors.textSecondary} />
            </Field>
            <Field label="Sobre a loja" colors={colors}>
              <TextInput style={[inputStyle, st.inputMultiline]} value={draftConfig.sobreTexto || ''} onChangeText={(v) => updateDraft({ sobreTexto: v })} multiline placeholder="Apresente sua loja em poucas linhas" placeholderTextColor={colors.textSecondary} />
            </Field>
            <SwitchLine label="Mostrar nome" value={draftConfig.usaNomeProfissional !== false} onValueChange={(v) => updateDraft({ usaNomeProfissional: v })} colors={colors} accent={accent} />
            <SwitchLine label="Mostrar título" value={draftConfig.mostrarTitulo !== false} onValueChange={(v) => updateDraft({ mostrarTitulo: v })} colors={colors} accent={accent} />
            <SwitchLine label="Mostrar subtítulo" value={draftConfig.mostrarSubtitulo !== false} onValueChange={(v) => updateDraft({ mostrarSubtitulo: v })} colors={colors} accent={accent} />
            <SwitchLine label="Mostrar slogan" value={draftConfig.mostrarSlogan !== false} onValueChange={(v) => updateDraft({ mostrarSlogan: v })} colors={colors} accent={accent} />
          </Card>

          <Card title="Posição no banner" hint="Arraste na pré-visualização ou use as setas. O item selecionado ganha a borda branca." colors={colors}>
            <SwitchLine
              label="Posicionar arrastando"
              value={!!draftConfig.heroPosicaoManual}
              onValueChange={(v) => {
                updateDraft({ heroPosicaoManual: v, ...(v ? { heroPosicoes: getHeroPosicoes(draftConfig) } : {}) });
                if (v) onOpenPreview?.();
              }}
              colors={colors}
              accent={accent}
            />
            {draftConfig.heroPosicaoManual ? (
              <>
                <HeroMoveDock
                  config={draftConfig}
                  selectedId={heroFocus}
                  onSelect={setHeroFocus}
                  onNudge={(dx, dy) => updateDraft({ heroPosicoes: nudgeHeroPos(draftConfig, heroFocus, dx, dy) })}
                  onCenter={() => {
                    const pos = getHeroPosicoes(draftConfig);
                    updateDraft({ heroPosicoes: { ...pos, [heroFocus]: { x: 50, y: pos[heroFocus].y } } });
                  }}
                  onReset={() => { playTapSound(); updateDraft({ heroPosicoes: { ...DEFAULT_HERO_POSICOES } }); }}
                  colors={colors}
                  accent={accent}
                />
                <TouchableOpacity onPress={() => { playTapSound(); onOpenPreview?.(); }} style={[st.linkBtn, { backgroundColor: accent, marginTop: 8 }]}>
                  <Ionicons name="hand-left-outline" size={16} color="#fff" />
                  <Text style={st.linkBtnText}>Arrastar na pré-visualização</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Field label="Posição da logo" colors={colors}>
                  <ChipRow options={HERO_DISPOSICOES} value={draftConfig.heroDisposicao || 'centro'} onChange={(v) => updateDraft({ heroDisposicao: v })} colors={colors} accent={accent} />
                </Field>
                <Field label="Alinhamento dos textos" colors={colors}>
                  <ChipRow options={HERO_ALINHAMENTOS} value={draftConfig.heroAlinhamentoTexto || 'centro'} onChange={(v) => updateDraft({ heroAlinhamentoTexto: v })} colors={colors} accent={accent} />
                </Field>
                <View style={[st.heroMiniPreview, { borderColor: colors.border, minHeight: 88 }]}>
                  <LinearGradient colors={theme.heroColors} start={theme.start} end={theme.end} style={{ minHeight: 88, justifyContent: 'center' }}>
                    <View style={[st.heroMiniInner, { alignItems: heroPreview.isRow ? 'center' : heroPreview.contentAlign, flexDirection: heroPreview.isRow ? 'row' : 'column' }]}>
                      {isHeroElementVisible(draftConfig, 'titulo') ? (
                        <Text style={st.heroMiniTitle} numberOfLines={1}>{draftConfig.titulo || 'Minha Loja'}</Text>
                      ) : null}
                    </View>
                  </LinearGradient>
                </View>
              </>
            )}
            <Field label="Tamanho do título" colors={colors}>
              <ChipRow options={TITULO_TAMANHOS} value={draftConfig.tituloTamanho || 'medio'} onChange={(v) => updateDraft({ tituloTamanho: v })} colors={colors} accent={accent} />
            </Field>
            <Field label="Altura do banner" colors={colors}>
              <ChipRow options={HERO_ALTURAS} value={draftConfig.heroAltura || 'normal'} onChange={(v) => updateDraft({ heroAltura: v })} colors={colors} accent={accent} />
            </Field>
          </Card>
        </>
      )}

      {tab === 'vitrine' && (
        <>
          <Card title="O que aparece" colors={colors}>
            <ChipRow options={CATALOGO_TIPOS} value={draftConfig.tipo} onChange={refreshItens} colors={colors} accent={accent} />
            <Field label="Layout" colors={colors}>
              <ChipRow options={CATALOGO_LAYOUTS} value={draftConfig.layout} onChange={(v) => updateDraft({ layout: v })} colors={colors} accent={accent} />
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
          <Card title="Link público" hint="Clientes abrem o catálogo, montam o carrinho e enviam o pedido." colors={colors}>
            {ownerUserId ? (
              <Text style={[st.hint, { color: colors.textSecondary }]}>
                ID de cadastro: <Text style={{ fontWeight: '800', color: colors.text }} selectable>{ownerUserId}</Text>
              </Text>
            ) : null}
            {lojaUrl ? <Text style={[st.linkPreview, { color: colors.text, borderColor: colors.border }]} selectable>{lojaUrl}</Text> : null}
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
            <SwitchLine label="Catálogo público ativo" value={draftConfig.lojaPublica !== false} onValueChange={(v) => updateDraft({ lojaPublica: v })} colors={colors} accent={accent} />
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
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.saveBtnText}>Salvar catálogo</Text>}
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
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  estiloGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  estiloCard: { width: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  linkActions: { flexDirection: 'row', gap: 8 },
  linkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  linkBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { flex: 1, textAlign: 'center' },
  heroMiniPreview: { marginTop: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  heroMiniInner: { padding: 14 },
  heroMiniTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
