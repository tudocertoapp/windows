import React, { useMemo } from 'react';
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
  buildHeroPresentation,
  getHeroPosicoes,
  isHeroElementVisible,
  syncCatalogoItens,
  itemKey,
  moveCatalogoItem,
  toggleCatalogoItemVisible,
  getLojaLogoUri,
} from '../../utils/catalogoStore';

function Section({ title, children, colors }) {
  return (
    <View style={[st.section, { borderColor: colors.border }]}>
      <Text style={[st.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

function ChipRow({ options, value, onChange, colors, accent }) {
  return (
    <View style={st.chipRow}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.id}
          onPress={() => { playTapSound(); onChange(o.id); }}
          style={[
            st.chip,
            {
              borderColor: value === o.id ? accent : colors.border,
              backgroundColor: value === o.id ? accent + '18' : colors.bg,
            },
          ]}
        >
          {o.icon ? <Ionicons name={o.icon} size={16} color={value === o.id ? accent : colors.textSecondary} /> : null}
          <Text style={[st.chipText, { color: value === o.id ? accent : colors.text }]} numberOfLines={2}>{o.label}</Text>
        </TouchableOpacity>
      ))}
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
}) {
  const accent = draftConfig.corPrincipal || colors.primary;

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

  const applyTema = (temaId) => {
    const tema = CATALOGO_TEMAS.find((t) => t.id === temaId);
    updateDraft({ tema: temaId, ...(tema ? { corPrincipal: tema.cor } : {}) });
  };

  const refreshItens = (tipo) => {
    const next = { ...draftConfig, tipo };
    const synced = syncCatalogoItens(next, products, services);
    updateDraft({ tipo, itens: synced });
  };

  const moveItem = (key, dir) => {
    updateDraft({ itens: moveCatalogoItem(draftConfig.itens, key, dir) });
  };

  const toggleVisible = (key) => {
    updateDraft({ itens: toggleCatalogoItemVisible(draftConfig.itens, key) });
  };

  const logoUri = getLojaLogoUri(draftConfig, profile, { forEdit: true });
  const heroPreview = useMemo(() => buildHeroPresentation(draftConfig), [draftConfig]);

  return (
    <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
      <Section title="LINK PÚBLICO DA LOJA" colors={colors}>
        <Text style={[st.hint, { color: colors.textSecondary }]}>
          Compartilhe este link com clientes. Eles podem ver seu perfil comercial, montar carrinho com produtos e serviços juntos, agendar online ou enviar pedido pelo WhatsApp.
        </Text>
        {ownerUserId ? (
          <Text style={[st.hint, { color: colors.textSecondary, marginBottom: 8 }]}>
            ID de cadastro (clientes podem buscar no app):{' '}
            <Text style={{ fontWeight: '700', color: colors.text }} selectable>{ownerUserId}</Text>
          </Text>
        ) : null}
        {lojaUrl ? (
          <Text style={[st.linkPreview, { color: colors.text, borderColor: colors.border }]} selectable numberOfLines={2}>{lojaUrl}</Text>
        ) : (
          <Text style={[st.hint, { color: colors.textSecondary }]}>Faça login e salve a loja para gerar o link.</Text>
        )}
        <View style={st.linkActions}>
          <TouchableOpacity style={[st.linkBtn, { backgroundColor: accent }]} onPress={onCopyLink} disabled={!ownerUserId}>
            <Ionicons name="copy-outline" size={18} color="#fff" />
            <Text style={st.linkBtnText}>Copiar link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.linkBtn, { backgroundColor: '#25D366' }]} onPress={onShareLink} disabled={!ownerUserId}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={st.linkBtnText}>Compartilhar</Text>
          </TouchableOpacity>
        </View>
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Loja pública ativa</Text>
          <Switch value={draftConfig.lojaPublica !== false} onValueChange={(v) => updateDraft({ lojaPublica: v })} trackColor={{ true: accent }} />
        </View>
      </Section>

      <Section title="IDENTIDADE DA LOJA" colors={colors}>
        <Text style={[st.label, { color: colors.textSecondary }]}>Logo / foto da loja</Text>
        <TouchableOpacity onPress={onPickLogo} disabled={uploadingLogo} style={[st.uploadRow, { borderColor: colors.border, backgroundColor: colors.bg }]}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={st.uploadImg} resizeMode="cover" />
          ) : (
            <View style={[st.uploadPh, { backgroundColor: accent + '22' }]}>
              <Ionicons name="camera" size={24} color={accent} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {uploadingLogo ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <Text style={{ fontWeight: '600', color: accent }}>{draftConfig.fotoCatalogo ? 'Trocar logo' : 'Enviar logo'}</Text>
            )}
          </View>
        </TouchableOpacity>
        <Text style={[st.hint, { color: colors.textSecondary, marginTop: 6 }]}>
          Logos pesadas ganham versão leve automática para editar a loja mais rápido. No link público, a imagem original em alta qualidade é usada.
        </Text>
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Mostrar logo</Text>
          <Switch value={draftConfig.usaLogo !== false} onValueChange={(v) => updateDraft({ usaLogo: v })} trackColor={{ true: accent }} />
        </View>
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Logo sem moldura</Text>
          <Switch
            value={!!draftConfig.logoSemMoldura}
            onValueChange={(v) => updateDraft({ logoSemMoldura: v, ...(v ? {} : { logoFormato: 'livre' }) })}
            trackColor={{ true: accent }}
          />
        </View>
        <Text style={[st.hint, { color: colors.textSecondary, marginTop: 4 }]}>
          Sem moldura remove a borda branca e permite ajustar tamanho, formato e posição da logo no banner.
        </Text>

        <Text style={[st.label, { color: colors.textSecondary, marginTop: 14 }]}>Tamanho da logo</Text>
        <ChipRow options={LOGO_TAMANHOS} value={draftConfig.logoTamanho || 'medio'} onChange={(v) => updateDraft({ logoTamanho: v })} colors={colors} accent={accent} />

        {draftConfig.logoSemMoldura ? (
          <>
            <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Formato da logo</Text>
            <ChipRow options={LOGO_FORMATOS} value={draftConfig.logoFormato || 'livre'} onChange={(v) => updateDraft({ logoFormato: v })} colors={colors} accent={accent} />
          </>
        ) : null}

        {!draftConfig.heroPosicaoManual ? (
          <>
            <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Posição da logo no banner</Text>
            <ChipRow options={HERO_DISPOSICOES} value={draftConfig.heroDisposicao || 'centro'} onChange={(v) => updateDraft({ heroDisposicao: v })} colors={colors} accent={accent} />

            <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Alinhamento dos textos</Text>
            <ChipRow options={HERO_ALINHAMENTOS} value={draftConfig.heroAlinhamentoTexto || 'centro'} onChange={(v) => updateDraft({ heroAlinhamentoTexto: v })} colors={colors} accent={accent} />
          </>
        ) : null}

        <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Tamanho do título</Text>
        <ChipRow options={TITULO_TAMANHOS} value={draftConfig.tituloTamanho || 'medio'} onChange={(v) => updateDraft({ tituloTamanho: v })} colors={colors} accent={accent} />

        <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Altura do banner</Text>
        <ChipRow options={HERO_ALTURAS} value={draftConfig.heroAltura || 'normal'} onChange={(v) => updateDraft({ heroAltura: v })} colors={colors} accent={accent} />

        <View style={[st.heroMiniPreview, { backgroundColor: accent, borderColor: colors.border, minHeight: draftConfig.heroPosicaoManual ? 100 : 88 }]}>
          {draftConfig.heroPosicaoManual ? (
            <View style={st.heroMiniManual}>
              {isHeroElementVisible(draftConfig, 'logo') && draftConfig.usaLogo !== false && (
                <View style={[st.heroMiniDot, { left: `${getHeroPosicoes(draftConfig).logo.x}%`, top: `${getHeroPosicoes(draftConfig).logo.y}%` }]}>
                  <Text style={st.heroMiniDotText}>Logo</Text>
                </View>
              )}
              {isHeroElementVisible(draftConfig, 'nome') && (
                <View style={[st.heroMiniDot, { left: `${getHeroPosicoes(draftConfig).nome.x}%`, top: `${getHeroPosicoes(draftConfig).nome.y}%` }]}>
                  <Text style={st.heroMiniDotText}>Nome</Text>
                </View>
              )}
              {isHeroElementVisible(draftConfig, 'titulo') && (
                <View style={[st.heroMiniDot, { left: `${getHeroPosicoes(draftConfig).titulo.x}%`, top: `${getHeroPosicoes(draftConfig).titulo.y}%` }]}>
                  <Text style={st.heroMiniDotText}>Título</Text>
                </View>
              )}
            </View>
          ) : (
          <View style={[
            st.heroMiniInner,
            {
              alignItems: heroPreview.isRow ? 'center' : heroPreview.contentAlign,
              flexDirection: heroPreview.isRow ? 'row' : 'column',
              gap: heroPreview.isRow ? 10 : 4,
            },
          ]}>
            {draftConfig.usaLogo !== false && (
              logoUri ? (
                <Image
                  source={{ uri: logoUri }}
                  style={[
                    heroPreview.logoStyle,
                    { width: Math.min(heroPreview.logoPx, 56), height: Math.min(heroPreview.logoPx, 56) },
                  ]}
                  resizeMode={heroPreview.logoResizeMode}
                />
              ) : (
                <View style={[
                  heroPreview.logoStyle,
                  {
                    width: Math.min(heroPreview.logoPx, 56),
                    height: Math.min(heroPreview.logoPx, 56),
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}>
                  <Ionicons name="storefront" size={18} color="#fff" />
                </View>
              )
            )}
            <View style={{ flex: heroPreview.isRow ? 1 : undefined, alignItems: heroPreview.flexAlign }}>
              {isHeroElementVisible(draftConfig, 'nome') ? (
                <Text style={st.heroMiniBrand} numberOfLines={1}>{draftConfig.nomeLoja || profile?.empresa || 'Loja'}</Text>
              ) : null}
              {isHeroElementVisible(draftConfig, 'titulo') ? (
                <Text style={[st.heroMiniTitle, { fontSize: Math.min(heroPreview.tituloPx, 16), textAlign: heroPreview.textAlign }]} numberOfLines={1}>
                  {draftConfig.titulo || 'Minha Loja'}
                </Text>
              ) : null}
              {isHeroElementVisible(draftConfig, 'subtitulo') ? (
                <Text style={[st.heroMiniSub, { textAlign: heroPreview.textAlign }]} numberOfLines={1}>{draftConfig.subtitulo}</Text>
              ) : null}
            </View>
          </View>
          )}
        </View>

        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Posicionamento manual (arrastar)</Text>
          <Switch
            value={!!draftConfig.heroPosicaoManual}
            onValueChange={(v) => updateDraft({
              heroPosicaoManual: v,
              ...(v ? { heroPosicoes: getHeroPosicoes(draftConfig) } : {}),
            })}
            trackColor={{ true: accent }}
          />
        </View>
        {draftConfig.heroPosicaoManual ? (
          <>
            <Text style={[st.hint, { color: colors.textSecondary }]}>
              Na aba Loja, arraste logo, nome, título e textos no banner. Textos e imagens são salvos automaticamente na nuvem.
            </Text>
            <TouchableOpacity
              style={[st.resetPosBtn, { borderColor: colors.border }]}
              onPress={() => { playTapSound(); updateDraft({ heroPosicoes: { ...DEFAULT_HERO_POSICOES } }); }}
            >
              <Ionicons name="refresh-outline" size={16} color={accent} />
              <Text style={{ color: accent, fontWeight: '700', fontSize: 13 }}>Resetar posições do banner</Text>
            </TouchableOpacity>
          </>
        ) : null}

        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Mostrar nome da loja</Text>
          <Switch value={draftConfig.usaNomeProfissional !== false} onValueChange={(v) => updateDraft({ usaNomeProfissional: v })} trackColor={{ true: accent }} />
        </View>
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Mostrar título</Text>
          <Switch value={draftConfig.mostrarTitulo !== false} onValueChange={(v) => updateDraft({ mostrarTitulo: v })} trackColor={{ true: accent }} />
        </View>
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Mostrar subtítulo</Text>
          <Switch value={draftConfig.mostrarSubtitulo !== false} onValueChange={(v) => updateDraft({ mostrarSubtitulo: v })} trackColor={{ true: accent }} />
        </View>
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Mostrar slogan</Text>
          <Switch value={draftConfig.mostrarSlogan !== false} onValueChange={(v) => updateDraft({ mostrarSlogan: v })} trackColor={{ true: accent }} />
        </View>
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Nome da loja</Text>
        <TextInput
          style={[st.input, { borderColor: colors.border, color: colors.text }]}
          value={draftConfig.nomeLoja || ''}
          onChangeText={(v) => updateDraft({ nomeLoja: v })}
          placeholder={profile?.empresa || profile?.nome || 'Nome da empresa'}
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 8 }]}>Título principal</Text>
        <TextInput style={[st.input, { borderColor: colors.border, color: colors.text }]} value={draftConfig.titulo} onChangeText={(v) => updateDraft({ titulo: v })} placeholderTextColor={colors.textSecondary} />
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 8 }]}>Subtítulo</Text>
        <TextInput style={[st.input, { borderColor: colors.border, color: colors.text }]} value={draftConfig.subtitulo} onChangeText={(v) => updateDraft({ subtitulo: v })} placeholderTextColor={colors.textSecondary} />
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 8 }]}>Slogan</Text>
        <TextInput style={[st.input, { borderColor: colors.border, color: colors.text }]} value={draftConfig.slogan || ''} onChangeText={(v) => updateDraft({ slogan: v })} placeholderTextColor={colors.textSecondary} />
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 8 }]}>Sobre a loja</Text>
        <TextInput
          style={[st.input, st.inputMultiline, { borderColor: colors.border, color: colors.text }]}
          value={draftConfig.sobreTexto || ''}
          onChangeText={(v) => updateDraft({ sobreTexto: v })}
          multiline
          numberOfLines={3}
          placeholder="Texto de apresentação da sua loja..."
          placeholderTextColor={colors.textSecondary}
        />
      </Section>

      <Section title="VISUAL E TEMA" colors={colors}>
        <Text style={[st.label, { color: colors.textSecondary }]}>Tema rápido</Text>
        <ChipRow options={CATALOGO_TEMAS} value={draftConfig.tema} onChange={applyTema} colors={colors} accent={accent} />
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Cor principal</Text>
        <View style={st.colorRow}>
          {CORES_CATALOGO.map((c) => (
            <TouchableOpacity key={c} onPress={() => { playTapSound(); updateDraft({ corPrincipal: c }); }} style={[st.colorDot, { backgroundColor: c, borderWidth: draftConfig.corPrincipal === c ? 3 : 0, borderColor: '#fff' }]} />
          ))}
        </View>
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Cor de fundo</Text>
        <View style={st.colorRow}>
          {CORES_FUNDO.map((c) => (
            <TouchableOpacity key={c} onPress={() => { playTapSound(); updateDraft({ corFundo: c }); }} style={[st.colorDot, { backgroundColor: c, borderWidth: draftConfig.corFundo === c ? 3 : 0, borderColor: colors.text }]} />
          ))}
        </View>
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Foto de fundo (banner)</Text>
        <TouchableOpacity onPress={onPickFundo} disabled={uploadingFundo} style={[st.uploadRow, { borderColor: colors.border, backgroundColor: colors.bg }]}>
          {draftConfig.fotoFundo ? (
            <Image source={{ uri: draftConfig.fotoFundo }} style={[st.uploadImg, { borderRadius: 8, width: 80, height: 48 }]} resizeMode="cover" />
          ) : (
            <View style={[st.uploadPh, { width: 80, height: 48, borderRadius: 8, backgroundColor: accent + '22' }]}>
              <Ionicons name="image" size={22} color={accent} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {uploadingFundo ? <ActivityIndicator size="small" color={accent} /> : <Text style={{ fontWeight: '600', color: accent }}>{draftConfig.fotoFundo ? 'Trocar banner' : 'Enviar banner'}</Text>}
          </View>
        </TouchableOpacity>
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Usar foto de fundo no banner</Text>
          <Switch value={!!draftConfig.usaFotoFundo} onValueChange={(v) => updateDraft({ usaFotoFundo: v })} trackColor={{ true: accent }} />
        </View>
      </Section>

      <Section title="CATEGORIAS DE PRODUTOS" colors={colors}>
        <ProductCategoriesEditor
          value={draftConfig.categoriasProdutos}
          onChange={(next) => updateDraft({ categoriasProdutos: next })}
          colors={colors}
          accent={accent}
          compact
        />
      </Section>

      <Section title="LAYOUT E EXIBIÇÃO" colors={colors}>
        <Text style={[st.label, { color: colors.textSecondary }]}>Catálogo na loja</Text>
        <ChipRow options={CATALOGO_TIPOS} value={draftConfig.tipo} onChange={refreshItens} colors={colors} accent={accent} />
        <Text style={[st.hint, { color: colors.textSecondary, marginTop: 6 }]}>
          Escolha exibir produtos e serviços juntos, ou apenas um tipo na vitrine e no carrossel da página inicial.
        </Text>
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Layout da loja</Text>
        <ChipRow options={CATALOGO_LAYOUTS} value={draftConfig.layout} onChange={(v) => updateDraft({ layout: v })} colors={colors} accent={accent} />
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Tamanho dos cards</Text>
        <ChipRow options={CATALOGO_CARD_SIZES} value={draftConfig.cardSize} onChange={(v) => updateDraft({ cardSize: v })} colors={colors} accent={accent} />
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Máximo de itens visíveis (0 = todos)</Text>
        <TextInput
          style={[st.input, { borderColor: colors.border, color: colors.text }]}
          value={String(draftConfig.maxItensVisiveis || 0)}
          onChangeText={(v) => updateDraft({ maxItensVisiveis: Math.max(0, parseInt(v.replace(/\D/g, ''), 10) || 0) })}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.textSecondary}
        />
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Mostrar preços</Text>
          <Switch value={draftConfig.mostrarPrecos !== false} onValueChange={(v) => updateDraft({ mostrarPrecos: v })} trackColor={{ true: accent }} />
        </View>
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Mostrar promoções</Text>
          <Switch value={draftConfig.mostrarPromocao !== false} onValueChange={(v) => updateDraft({ mostrarPromocao: v })} trackColor={{ true: accent }} />
        </View>
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Carrinho de compras</Text>
          <Switch value={draftConfig.mostrarCarrinho !== false} onValueChange={(v) => updateDraft({ mostrarCarrinho: v })} trackColor={{ true: accent }} />
        </View>
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Carrossel automático</Text>
          <Switch value={draftConfig.carouselAuto !== false} onValueChange={(v) => updateDraft({ carouselAuto: v })} trackColor={{ true: accent }} />
        </View>
      </Section>

      <Section title="PRODUTOS E SERVIÇOS — ORDEM E VISIBILIDADE" colors={colors}>
        <Text style={[st.hint, { color: colors.textSecondary }]}>
          Escolha o que aparece na loja, defina a ordem ou toque no lápis para editar foto, nome e preço (sincroniza com o cadastro do app).
        </Text>
        {itemRows.map((row, idx) => (
          <View key={row._key} style={[st.itemRow, { borderColor: colors.border, backgroundColor: colors.bg, opacity: row.visible === false ? 0.5 : 1 }]}>
            <Ionicons name={row.tipo === 'servico' ? 'construct-outline' : 'cube-outline'} size={18} color={accent} />
            <Text style={[st.itemName, { color: colors.text }]} numberOfLines={1}>{row.name}</Text>
            {onEditItem ? (
              <TouchableOpacity onPress={() => onEditItem(row)} hitSlop={8}>
                <Ionicons name="pencil" size={18} color={accent} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => toggleVisible(row._key)} hitSlop={8}>
              <Ionicons name={row.visible !== false ? 'eye' : 'eye-off'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => moveItem(row._key, 'up')} disabled={idx === 0} hitSlop={8}>
              <Ionicons name="chevron-up" size={20} color={idx === 0 ? colors.border : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => moveItem(row._key, 'down')} disabled={idx === itemRows.length - 1} hitSlop={8}>
              <Ionicons name="chevron-down" size={20} color={idx === itemRows.length - 1 ? colors.border : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
      </Section>

      <Section title="AGENDAMENTO ONLINE" colors={colors}>
        <Text style={[st.hint, { color: colors.textSecondary }]}>
          Clientes podem ver horários livres na sua agenda e agendar produtos + serviços no mesmo dia (entrega + procedimento).
        </Text>
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Permitir agendamento online</Text>
          <Switch value={draftConfig.agendamentoOnline !== false} onValueChange={(v) => updateDraft({ agendamentoOnline: v })} trackColor={{ true: accent }} />
        </View>
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 12 }]}>Horário de atendimento</Text>
        <View style={st.timeRow}>
          <TextInput style={[st.input, st.timeInput, { borderColor: colors.border, color: colors.text }]} value={draftConfig.agendaHoraInicio || '08:00'} onChangeText={(v) => updateDraft({ agendaHoraInicio: v })} placeholder="08:00" />
          <Text style={{ color: colors.textSecondary }}>até</Text>
          <TextInput style={[st.input, st.timeInput, { borderColor: colors.border, color: colors.text }]} value={draftConfig.agendaHoraFim || '18:00'} onChangeText={(v) => updateDraft({ agendaHoraFim: v })} placeholder="18:00" />
        </View>
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 8 }]}>Intervalo entre horários (min)</Text>
        <TextInput style={[st.input, { borderColor: colors.border, color: colors.text }]} value={String(draftConfig.agendaIntervaloMin || 30)} onChangeText={(v) => updateDraft({ agendaIntervaloMin: Math.max(15, parseInt(v.replace(/\D/g, ''), 10) || 30) })} keyboardType="number-pad" />
        <Text style={[st.label, { color: colors.textSecondary, marginTop: 8 }]}>Duração do atendimento (min)</Text>
        <TextInput style={[st.input, { borderColor: colors.border, color: colors.text }]} value={String(draftConfig.agendaDuracaoMin || 60)} onChangeText={(v) => updateDraft({ agendaDuracaoMin: Math.max(15, parseInt(v.replace(/\D/g, ''), 10) || 60) })} keyboardType="number-pad" />
      </Section>

      <Section title="WHATSAPP — PEDIDOS" colors={colors}>
        <Text style={[st.hint, { color: colors.textSecondary }]}>Número que receberá os pedidos do carrinho. Deixe vazio para usar o telefone do perfil.</Text>
        <TextInput
          style={[st.input, { borderColor: colors.border, color: colors.text }]}
          value={draftConfig.whatsappPedido || ''}
          onChangeText={(v) => updateDraft({ whatsappPedido: v })}
          placeholder={profile?.telefone || '(11) 99999-9999'}
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
        />
      </Section>

      <TouchableOpacity style={[st.saveBtn, { backgroundColor: colors.primary }]} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.saveBtnText}>Salvar loja</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  hint: { fontSize: 12, marginBottom: 10, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, maxWidth: '48%' },
  chipText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  uploadImg: { width: 56, height: 56, borderRadius: 28 },
  uploadPh: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  switchLabel: { fontSize: 14, flex: 1, marginRight: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '500' },
  saveBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  linkPreview: { fontSize: 12, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  linkActions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  linkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  linkBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { flex: 1, textAlign: 'center' },
  heroMiniPreview: { marginTop: 14, borderRadius: 12, borderWidth: 1, overflow: 'hidden', minHeight: 88 },
  heroMiniInner: { padding: 14, width: '100%' },
  heroMiniBrand: { fontSize: 9, fontWeight: '700', color: '#fff', opacity: 0.9 },
  heroMiniTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginTop: 2 },
  heroMiniSub: { fontSize: 10, color: '#fff', opacity: 0.85, marginTop: 2 },
  heroMiniManual: { flex: 1, minHeight: 88, position: 'relative' },
  heroMiniDot: {
    position: 'absolute',
    transform: [{ translateX: -20 }, { translateY: -10 }],
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroMiniDotText: { fontSize: 8, fontWeight: '800', color: '#0f172a' },
  resetPosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
});
