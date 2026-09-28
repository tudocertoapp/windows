import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/format';
import {
  getEffectivePrice,
  getResponsiveGridColumns,
  getCatalogoTheme,
  getCatalogoRotulos,
  getCatalogoFontColors,
  getLojaDisplayName,
  getLojaLogoUri,
  buildHeroPresentation,
} from '../../utils/catalogoStore';
import { playTapSound } from '../../utils/sounds';
import { getNextAvailableDates } from '../../utils/agendaAvailability';
import { LojaAgendaPicker } from './LojaAgendaPicker';
import { LojaHeroBanner } from './LojaHeroBanner';

const { width: SW } = Dimensions.get('window');
const CATEGORIA_TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'servicos', label: 'Serviços' },
];

function hexLum(hex) {
  const raw = String(hex || '').replace('#', '');
  const n = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (n.length < 6) return 0.5;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function qtyColors(theme) {
  let bg = theme.corPrincipal || '#2563eb';
  const cardL = hexLum(theme.cardBg);
  if (Math.abs(hexLum(bg) - cardL) < 0.2) {
    bg = hexLum(theme.corTexto) > 0.55 ? theme.corTexto : (cardL > 0.5 ? '#0f172a' : '#f8fafc');
  }
  const fg = hexLum(bg) > 0.55 ? '#0f172a' : '#ffffff';
  return { bg, fg };
}

function getItemPhoto(item) {
  if (!item) return null;
  const data = item.data && typeof item.data === 'object' ? item.data : {};
  const list = data.photo_uris || item.photoUris || item.photos || item.photo_uris;
  const first = (Array.isArray(list) ? list[0] : null)
    || item.photoUri || item.photo_uri || item.foto || data.photo_uri;
  const uri = typeof first === 'string' ? first : first?.uri;
  if (!uri || uri.startsWith('blob:') || uri.startsWith('file:')) return null;
  return uri;
}

export function CatalogoStoreView({
  config,
  items,
  profile,
  cart = [],
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onSendWhatsApp,
  onFetchAvailability,
  onBookOnline,
  onBookingComplete,
  previewWidth,
  interactive = true,
  ownerMode = false,
  onEditItem,
  onHeroPositionChange,
  onHeroScaleChange,
  onHeroTextChange,
}) {
  const [search, setSearch] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [lojaCatId, setLojaCatId] = useState('todos');
  const [lojaSubId, setLojaSubId] = useState('todos');
  const [cartOpen, setCartOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [busyEvents, setBusyEvents] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingDone, setBookingDone] = useState(null);
  const [heroDragging, setHeroDragging] = useState(false);
  const carouselRef = useRef(null);
  const [measuredW, setMeasuredW] = useState(0);

  const agendamentoAtivo = config.agendamentoOnline !== false && !!onFetchAvailability;

  useEffect(() => {
    if (!agendamentoAtivo || selectedDate) return;
    const dates = getNextAvailableDates(config, 14);
    if (dates[0]) setSelectedDate(dates[0]);
  }, [agendamentoAtivo, config, selectedDate]);

  const theme = getCatalogoTheme(config);
  const rotulos = getCatalogoRotulos(config);
  const fonts = getCatalogoFontColors(config, theme);
  const cardBg = theme.cardBg;
  const qtyTone = qtyColors(theme);
  const storeW = measuredW || previewWidth || SW;
  const cols = getResponsiveGridColumns(storeW);
  const gap = 10;
  const pad = 12;
  const innerW = Math.max(0, storeW - pad * 2);
  const cardW = cols > 0 ? (innerW - gap * (cols - 1)) / cols : innerW;

  const lojaNome = getLojaDisplayName(config, profile);
  const logoUri = config.usaLogo !== false
    ? getLojaLogoUri(config, profile, { forEdit: ownerMode })
    : null;

  const lojaCategorias = config.categoriasProdutos;
  const categoriasEnabled = lojaCategorias?.enabled && (lojaCategorias?.items?.length > 0);
  const activeCategory = categoriasEnabled
    ? lojaCategorias.items.find((c) => String(c.id) === String(lojaCatId))
    : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items || [];
    if (config.tipo === 'produtos') list = list.filter((i) => i._tipo === 'produto');
    else if (config.tipo === 'servicos') list = list.filter((i) => i._tipo === 'servico');
    else if (categoriaAtiva === 'produtos') list = list.filter((i) => i._tipo === 'produto');
    else if (categoriaAtiva === 'servicos') list = list.filter((i) => i._tipo === 'servico');
    if (categoriasEnabled && lojaCatId !== 'todos') {
      list = list.filter((i) => i._tipo !== 'produto' || String(i.categoryId) === String(lojaCatId));
    }
    if (categoriasEnabled && lojaSubId !== 'todos') {
      list = list.filter((i) => i._tipo !== 'produto' || String(i.subcategoryId) === String(lojaSubId));
    }
    if (q) list = list.filter((i) => String(i.name || '').toLowerCase().includes(q));
    return list;
  }, [items, search, categoriaAtiva, config.tipo, categoriasEnabled, lojaCatId, lojaSubId]);

  const carouselItems = filtered.slice(0, Math.min(12, filtered.length));
  const CAROUSEL_ITEM_W = storeW - pad * 2;
  const CAROUSEL_IMG_H = 200;
  const showCarousel = config.layout === 'carrossel' && carouselItems.length > 0;

  const carouselCardHeight = useMemo(() => {
    let body = 16;
    body += 38;
    if (config.mostrarPrecos !== false) body += 22;
    if (interactive && config.mostrarCarrinho !== false) body += 40;
    return CAROUSEL_IMG_H + body;
  }, [config.mostrarPrecos, config.mostrarCarrinho, interactive]);

  useEffect(() => {
    if (!showCarousel || !config.carouselAuto || carouselItems.length <= 1) return;
    const t = setInterval(() => {
      setCarouselIndex((prev) => {
        const next = (prev + 1) % carouselItems.length;
        carouselRef.current?.scrollToOffset({ offset: next * CAROUSEL_ITEM_W, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(t);
  }, [showCarousel, config.carouselAuto, carouselItems.length, CAROUSEL_ITEM_W]);

  useEffect(() => {
    if (!selectedDate || !onFetchAvailability) {
      setAvailableSlots([]);
      setBusyEvents([]);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedTime('');
    onFetchAvailability(selectedDate)
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          setAvailableSlots(data);
          setBusyEvents([]);
        } else {
          setAvailableSlots(data?.slots || []);
          setBusyEvents(data?.busy || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableSlots([]);
          setBusyEvents([]);
        }
      })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [selectedDate, onFetchAvailability]);

  const clientExtras = { clientName, clientPhone, clientNotes, schedule: selectedDate && selectedTime ? { date: selectedDate, time: selectedTime } : null };

  const handleWhatsApp = () => {
    playTapSound();
    onSendWhatsApp?.(clientExtras);
    setCartOpen(false);
  };

  const handleBook = async () => {
    if (!clientName.trim()) return;
    if (!clientPhone.trim()) return;
    if (!selectedDate || !selectedTime) return;
    playTapSound();
    setBooking(true);
    try {
      const res = await onBookOnline?.({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientNotes: clientNotes.trim(),
        schedule: { date: selectedDate, time: selectedTime },
        cart,
      });
      setBookingDone(res?.message || 'Agendamento confirmado!');
      onBookingComplete?.();
    } catch (e) {
      setBookingDone(e?.message || 'Não foi possível agendar. Tente outro horário.');
    }
    setBooking(false);
  };

  const cartCount = cart.reduce((s, l) => s + (l.qty || 1), 0);
  const cartTotal = cart.reduce((s, l) => s + getEffectivePrice(l.item) * (l.qty || 1), 0);

  const cardHeights = { pequeno: 180, medio: 220, grande: 280 };
  const cardH = cardHeights[config.cardSize] || cardHeights.medio;

  const renderPrice = (item) => {
    if (config.mostrarPrecos === false) return null;
    const price = Number(item.price) || 0;
    const effective = getEffectivePrice(item);
    const temPromo = config.mostrarPromocao !== false && Number(item.discount) > 0;
    return (
      <View style={st.priceRow}>
        {temPromo && <Text style={[st.priceOld, { color: fonts.produto + '88' }]}>{formatCurrency(price)}</Text>}
        <Text style={[st.price, { color: fonts.preco }]}>{formatCurrency(effective)}</Text>
        {temPromo && (
          <View style={st.promoBadge}>
            <Text style={st.promoText}>PROMO</Text>
          </View>
        )}
      </View>
    );
  };

  const renderEditBtn = (item) => {
    if (!ownerMode || !onEditItem) return null;
    return (
      <TouchableOpacity
        style={[st.editBtn, { backgroundColor: config.corPrincipal }]}
        onPress={() => { playTapSound(); onEditItem(item); }}
        hitSlop={8}
      >
        <Ionicons name="pencil" size={14} color="#fff" />
      </TouchableOpacity>
    );
  };

  const renderProductCard = (item, opts = {}) => {
    const { fullWidth, carousel } = opts;
    const photo = getItemPhoto(item);
    const w = fullWidth ? '100%' : carousel ? CAROUSEL_ITEM_W : cardW;
    const h = carousel ? CAROUSEL_IMG_H : cardH * 0.55;
    return (
      <View
        key={item._rowId || item.id}
        style={[
          st.card,
          carousel && st.cardCarousel,
          {
            width: w,
            minHeight: carousel ? undefined : cardH,
            backgroundColor: cardBg,
            borderColor: config.corPrincipal + '22',
          },
        ]}
      >
        {photo ? (
          <View>
            <Image source={{ uri: photo }} style={[st.cardImg, { height: h }]} resizeMode="cover" />
            {renderEditBtn(item)}
          </View>
        ) : (
          <View style={[st.cardImg, st.cardImgPh, { height: h, backgroundColor: config.corPrincipal + '18' }]}>
            <Ionicons name={item._tipo === 'servico' ? 'construct' : 'cube'} size={carousel ? 48 : 32} color={config.corPrincipal} />
            {renderEditBtn(item)}
          </View>
        )}
        <View style={[st.cardBody, carousel && st.cardBodyCarousel]}>
          <Text style={[st.cardName, { color: fonts.produto }]} numberOfLines={2}>{item.name}</Text>
          {renderPrice(item)}
          {interactive && config.mostrarCarrinho !== false && (
            <TouchableOpacity
              style={[st.addBtn, { backgroundColor: config.corPrincipal }]}
              onPress={() => { playTapSound(); onAddToCart?.(item); }}
              activeOpacity={0.85}
            >
              <Ionicons name="cart-outline" size={16} color="#fff" />
              <Text style={st.addBtnText} numberOfLines={1}>
                {(typeof w === 'number' && w < 200) ? 'Adicionar' : 'Adicionar ao carrinho'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderListItem = (item) => {
    const photo = getItemPhoto(item);
    return (
      <View key={item._rowId || item.id} style={[st.listRow, { borderColor: config.corPrincipal + '22', backgroundColor: cardBg }]}>
        <View style={{ position: 'relative' }}>
          {photo ? (
            <Image source={{ uri: photo }} style={st.listImg} resizeMode="cover" />
          ) : (
            <View style={[st.listImg, st.cardImgPh, { backgroundColor: config.corPrincipal + '18' }]}>
              <Ionicons name={item._tipo === 'servico' ? 'construct' : 'cube'} size={24} color={config.corPrincipal} />
            </View>
          )}
          {ownerMode && onEditItem ? (
            <TouchableOpacity
              style={[st.editBtnSmall, { backgroundColor: config.corPrincipal }]}
              onPress={() => { playTapSound(); onEditItem(item); }}
            >
              <Ionicons name="pencil" size={12} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={st.listInfo}>
          <Text style={[st.cardName, { color: fonts.produto }]} numberOfLines={2}>{item.name}</Text>
          {renderPrice(item)}
        </View>
        {interactive && config.mostrarCarrinho !== false && (
          <TouchableOpacity style={[st.listAdd, { backgroundColor: config.corPrincipal }]} onPress={() => { playTapSound(); onAddToCart?.(item); }}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderGrid = () => (
    <View style={[st.grid, { marginHorizontal: -gap / 2, paddingTop: showCarousel ? 2 : 8, paddingBottom: 8 }]}>
      {filtered.map((item) => (
        <View
          key={item._rowId || item.id}
          style={{ width: `${100 / cols}%`, paddingHorizontal: gap / 2, marginBottom: gap, boxSizing: 'border-box' }}
        >
          {renderProductCard(item, { fullWidth: true })}
        </View>
      ))}
    </View>
  );

  const heroBg = config.usaFotoFundo && config.fotoFundo
    ? { uri: config.fotoFundo }
    : null;

  const hero = useMemo(() => buildHeroPresentation(config), [config]);

  const handleHeroPositionChange = useCallback((id, pos) => {
    onHeroPositionChange?.(id, pos);
  }, [onHeroPositionChange]);

  return (
    <View
      style={[st.root, { backgroundColor: theme.corFundo || config.corFundo || '#f8fafc' }]}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== measuredW) setMeasuredW(w);
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={!heroDragging}
        nestedScrollEnabled
        contentContainerStyle={{ paddingBottom: interactive ? 88 : 24 }}
        style={heroDragging ? { overflow: 'hidden' } : undefined}
      >
        <LojaHeroBanner
          config={config}
          hero={hero}
          lojaNome={lojaNome}
          logoUri={logoUri}
          heroBg={heroBg}
          heroEditMode={ownerMode && config.heroPosicaoManual === true}
          heroResizeMode={ownerMode}
          onHeroPositionChange={handleHeroPositionChange}
          onHeroScaleChange={onHeroScaleChange}
          onHeroTextChange={onHeroTextChange}
          onDragStateChange={setHeroDragging}
        />

        {config.sobreTexto ? (
          <View style={[st.about, { backgroundColor: cardBg, borderColor: config.corPrincipal + '22' }]}>
            <Text style={[st.aboutText, { color: fonts.sobre }]}>{config.sobreTexto}</Text>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: pad, paddingTop: 16 }}>
          {ownerMode && (
            <View style={[st.ownerHint, { backgroundColor: config.corPrincipal + '15', borderColor: config.corPrincipal + '33' }]}>
              <Ionicons name="information-circle-outline" size={18} color={config.corPrincipal} />
              <Text style={[st.ownerHintText, { color: fonts.produto }]}>
                {config.heroPosicaoManual
                  ? 'Toque no logo ou nos textos do cabeçalho para selecionar e editar.'
                  : rotulos.dicaEdicao}
              </Text>
            </View>
          )}
          <View style={[st.searchWrap, { borderColor: config.corPrincipal + '33', backgroundColor: cardBg }]}>
            <Ionicons name="search" size={18} color={fonts.produto + '66'} />
            <TextInput
              style={[st.searchInput, { color: fonts.produto }]}
              placeholder={rotulos.buscar}
              placeholderTextColor={fonts.produto + '55'}
              value={search}
              onChangeText={setSearch}
              editable={interactive}
            />
          </View>

          {config.tipo === 'ambos' && (
            <View style={st.tabs}>
              {CATEGORIA_TABS.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => { playTapSound(); setCategoriaAtiva(cat.id); }}
                  style={[st.tab, categoriaAtiva === cat.id && { borderBottomColor: config.corPrincipal, borderBottomWidth: 2 }]}
                >
                  <Text style={[st.tabText, { color: categoriaAtiva === cat.id ? fonts.preco : fonts.produto + '88' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {config.tipo === 'produtos' && (
            <View style={[st.tipoBadge, { backgroundColor: config.corPrincipal + '15' }]}>
              <Ionicons name="cube-outline" size={16} color={config.corPrincipal} />
              <Text style={[st.tipoBadgeText, { color: config.corPrincipal }]}>Apenas produtos</Text>
            </View>
          )}
          {config.tipo === 'servicos' && (
            <View style={[st.tipoBadge, { backgroundColor: config.corPrincipal + '15' }]}>
              <Ionicons name="construct-outline" size={16} color={config.corPrincipal} />
              <Text style={[st.tipoBadgeText, { color: config.corPrincipal }]}>Apenas serviços</Text>
            </View>
          )}

          {categoriasEnabled && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.catTabs} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={() => { playTapSound(); setLojaCatId('todos'); setLojaSubId('todos'); }}
                  style={[st.catChip, { borderColor: lojaCatId === 'todos' ? config.corPrincipal : config.corPrincipal + '33', backgroundColor: lojaCatId === 'todos' ? config.corPrincipal + '18' : cardBg }]}
                >
                  <Text style={[st.catChipText, { color: lojaCatId === 'todos' ? config.corPrincipal : config.corTexto }]}>Todas categorias</Text>
                </TouchableOpacity>
                {lojaCategorias.items.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => { playTapSound(); setLojaCatId(cat.id); setLojaSubId('todos'); }}
                    style={[st.catChip, { borderColor: String(lojaCatId) === String(cat.id) ? config.corPrincipal : config.corPrincipal + '33', backgroundColor: String(lojaCatId) === String(cat.id) ? config.corPrincipal + '18' : cardBg }]}
                  >
                    <Text style={[st.catChipText, { color: String(lojaCatId) === String(cat.id) ? config.corPrincipal : config.corTexto }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {activeCategory?.subcategorias?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.subCatTabs} contentContainerStyle={{ gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => { playTapSound(); setLojaSubId('todos'); }}
                    style={[st.catChip, { borderColor: lojaSubId === 'todos' ? config.corPrincipal : config.corPrincipal + '33', backgroundColor: lojaSubId === 'todos' ? config.corPrincipal + '18' : cardBg }]}
                  >
                    <Text style={[st.catChipText, { color: lojaSubId === 'todos' ? config.corPrincipal : config.corTexto }]}>Todas</Text>
                  </TouchableOpacity>
                  {activeCategory.subcategorias.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      onPress={() => { playTapSound(); setLojaSubId(sub.id); }}
                      style={[st.catChip, { borderColor: String(lojaSubId) === String(sub.id) ? config.corPrincipal : config.corPrincipal + '33', backgroundColor: String(lojaSubId) === String(sub.id) ? config.corPrincipal + '18' : cardBg }]}
                    >
                      <Text style={[st.catChipText, { color: String(lojaSubId) === String(sub.id) ? config.corPrincipal : config.corTexto }]}>{sub.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          )}

          {showCarousel && (
            <View style={st.secao}>
              <FlatList
                ref={carouselRef}
                data={carouselItems}
                horizontal
                pagingEnabled
                snapToInterval={CAROUSEL_ITEM_W}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                style={{ height: carouselCardHeight }}
                keyExtractor={(i) => i._rowId || String(i.id)}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_ITEM_W);
                  setCarouselIndex(Math.min(idx, carouselItems.length - 1));
                }}
                renderItem={({ item }) => renderProductCard(item, { carousel: true })}
              />
              {carouselItems.length > 1 && (
                <View style={st.dots}>
                  {carouselItems.map((_, i) => (
                    <View key={i} style={[st.dot, { backgroundColor: carouselIndex === i ? config.corPrincipal : config.corTexto + '33' }]} />
                  ))}
                </View>
              )}
            </View>
          )}

          {filtered.length === 0 ? (
            <View style={st.empty}>
              <Ionicons name="bag-outline" size={48} color={config.corTexto + '44'} />
              <Text style={{ color: config.corTexto + '88', textAlign: 'center' }}>{rotulos.vazio}</Text>
            </View>
          ) : config.layout === 'horizontal' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap, paddingVertical: 8 }}>
              {filtered.map((item) => renderProductCard(item, { fullWidth: false }))}
            </ScrollView>
          ) : config.layout === 'vertical' ? (
            <View style={{ gap: 10, paddingVertical: 8 }}>{filtered.map(renderListItem)}</View>
          ) : (
            renderGrid()
          )}
        </View>
      </ScrollView>

      {interactive && config.mostrarCarrinho !== false && (
        <>
          <TouchableOpacity
            style={[st.cartBar, { backgroundColor: config.corPrincipal }]}
            onPress={() => { playTapSound(); setCartOpen(true); }}
            activeOpacity={0.9}
          >
            <Ionicons name="cart" size={22} color="#fff" />
            <Text style={st.cartBarText}>
              {cartCount > 0 ? `Acessar carrinho (${cartCount})` : 'Acessar carrinho'}
            </Text>
            <Text style={st.cartBarTotal}>{cartCount > 0 ? formatCurrency(cartTotal) : ''}</Text>
          </TouchableOpacity>

          <Modal visible={cartOpen} transparent animationType="slide" onRequestClose={() => setCartOpen(false)}>
            <Pressable style={st.cartOverlay} onPress={() => setCartOpen(false)}>
              <Pressable style={[st.cartSheet, { backgroundColor: cardBg }]} onPress={(e) => e.stopPropagation()}>
                <View style={st.cartHeader}>
                  <Text style={[st.cartTitle, { color: config.corTexto }]}>Seu carrinho</Text>
                  <TouchableOpacity onPress={() => setCartOpen(false)}>
                    <Ionicons name="close" size={24} color={config.corTexto} />
                  </TouchableOpacity>
                </View>
                {cart.length === 0 ? (
                  <View style={st.cartEmpty}>
                    <Ionicons name="cart-outline" size={48} color={config.corTexto + '44'} />
                    <Text style={{ color: config.corTexto + '88' }}>Carrinho vazio</Text>
                  </View>
                ) : bookingDone ? (
                  <View style={st.cartEmpty}>
                    <Ionicons name="checkmark-circle" size={56} color={config.corPrincipal} />
                    <Text style={[st.bookDoneText, { color: config.corTexto }]}>{bookingDone}</Text>
                    <TouchableOpacity style={[st.scheduleBtn, { backgroundColor: config.corPrincipal, marginTop: 16 }]} onPress={() => { setBookingDone(null); setCartOpen(false); }}>
                      <Text style={st.scheduleBtnText}>Fechar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
                    {cart.map((line) => {
                      const photo = getItemPhoto(line.item);
                      return (
                      <View key={line.key} style={[st.cartLine, { borderColor: config.corPrincipal + '22' }]}>
                        {photo ? (
                          <Image source={{ uri: photo }} style={st.cartThumb} resizeMode="cover" />
                        ) : (
                          <View style={[st.cartThumb, st.cardImgPh, { backgroundColor: config.corPrincipal + '22' }]}>
                            <Ionicons name={line.item._tipo === 'servico' ? 'construct' : 'cube'} size={18} color={config.corPrincipal} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[st.cartLineName, { color: fonts.produto }]} numberOfLines={2}>{line.item.name}</Text>
                          <Text style={{ color: fonts.produto, opacity: 0.7, fontSize: 12 }}>
                            {`Unidade ${formatCurrency(getEffectivePrice(line.item))} · Qtd ${line.qty || 1}`}
                          </Text>
                          <Text style={{ color: fonts.preco, fontWeight: '700' }}>
                            {`Total ${formatCurrency(getEffectivePrice(line.item) * (line.qty || 1))}`}
                          </Text>
                        </View>
                        <View style={st.qtyRow}>
                          <TouchableOpacity
                            style={[st.qtyBtn, { backgroundColor: qtyTone.bg, borderColor: qtyTone.bg }]}
                            onPress={() => onUpdateQty?.(line.key, (line.qty || 1) - 1)}
                          >
                            <Ionicons name="remove" size={18} color={qtyTone.fg} />
                          </TouchableOpacity>
                          <Text style={[st.qtyVal, { color: fonts.produto }]}>{line.qty || 1}</Text>
                          <TouchableOpacity
                            style={[st.qtyBtn, { backgroundColor: qtyTone.bg, borderColor: qtyTone.bg }]}
                            onPress={() => onUpdateQty?.(line.key, (line.qty || 1) + 1)}
                          >
                            <Ionicons name="add" size={18} color={qtyTone.fg} />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => onRemoveFromCart?.(line.key)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                      );
                    })}

                    <Text style={[st.cartSectionLabel, { color: config.corTexto }]}>Seus dados</Text>
                    <TextInput style={[st.clientInput, { borderColor: config.corPrincipal + '33', color: config.corTexto }]} placeholder="Seu nome" placeholderTextColor={config.corTexto + '66'} value={clientName} onChangeText={setClientName} />
                    <TextInput style={[st.clientInput, { borderColor: config.corPrincipal + '33', color: config.corTexto }]} placeholder="WhatsApp / telefone" placeholderTextColor={config.corTexto + '66'} value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" />
                    <TextInput style={[st.clientInput, st.clientInputMulti, { borderColor: config.corPrincipal + '33', color: config.corTexto }]} placeholder="Observações (opcional)" placeholderTextColor={config.corTexto + '66'} value={clientNotes} onChangeText={setClientNotes} multiline />

                    {agendamentoAtivo && (
                      <LojaAgendaPicker
                        config={config}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        selectedTime={selectedTime}
                        onSelectTime={setSelectedTime}
                        schedule={{ slots: availableSlots, busy: busyEvents }}
                        loading={loadingSlots}
                        accent={config.corPrincipal}
                        textColor={config.corTexto}
                        borderColor={config.corPrincipal + '22'}
                      />
                    )}
                  </ScrollView>
                )}
                {!bookingDone && (
                  <>
                    <View style={[st.cartFooter, { borderTopColor: config.corPrincipal + '22' }]}>
                      <Text style={[st.cartTotalLabel, { color: config.corTexto }]}>Total</Text>
                      <Text style={[st.cartTotalVal, { color: config.corPrincipal }]}>{formatCurrency(cartTotal)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[st.waBtn, { backgroundColor: '#25D366', opacity: cart.length ? 1 : 0.5 }]}
                      disabled={!cart.length}
                      onPress={handleWhatsApp}
                    >
                      <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                      <Text style={st.waBtnText}>Enviar pedido pelo WhatsApp</Text>
                    </TouchableOpacity>
                    {agendamentoAtivo && onBookOnline && (
                      <TouchableOpacity
                        style={[st.scheduleBtn, { backgroundColor: config.corPrincipal, opacity: cart.length && clientName.trim() && clientPhone.trim() && selectedDate && selectedTime ? 1 : 0.5 }]}
                        disabled={!cart.length || !clientName.trim() || !clientPhone.trim() || !selectedDate || !selectedTime || booking}
                        onPress={handleBook}
                      >
                        {booking ? <ActivityIndicator color="#fff" /> : (
                          <>
                            <Ionicons name="calendar" size={20} color="#fff" />
                            <Text style={st.scheduleBtnText}>Confirmar agendamento online</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  about: { margin: 16, marginBottom: 0, padding: 16, borderRadius: 12, borderWidth: 1 },
  aboutText: { fontSize: 14, lineHeight: 22 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  tabs: { flexDirection: 'row', marginTop: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  tab: { paddingVertical: 10, paddingHorizontal: 14, marginRight: 4 },
  tabText: { fontSize: 13, fontWeight: '700' },
  tipoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  tipoBadgeText: { fontSize: 13, fontWeight: '700' },
  catTabs: { marginTop: 14 },
  subCatTabs: { marginTop: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  catChipText: { fontSize: 12, fontWeight: '700' },
  secao: { marginTop: 20, overflow: 'hidden' },
  secaoTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 22, marginBottom: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 0, width: '100%' },
  cardCarousel: { marginBottom: 0 },
  cardBodyCarousel: { paddingTop: 8, paddingHorizontal: 10, paddingBottom: 8 },
  cardImg: { width: '100%' },
  cardImgPh: { justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 10, gap: 4 },
  cardName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  priceOld: { fontSize: 11, textDecorationLine: 'line-through' },
  price: { fontSize: 15, fontWeight: '800' },
  promoBadge: { backgroundColor: '#ef4444', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  promoText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 12 },
  listImg: { width: 64, height: 64, borderRadius: 10 },
  listInfo: { flex: 1 },
  listAdd: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  cartBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cartBarText: { color: '#fff', fontSize: 15, fontWeight: '800', flex: 1 },
  cartBarTotal: { color: '#fff', fontSize: 15, fontWeight: '800' },
  cartFab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  cartOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  cartSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '80%' },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cartTitle: { fontSize: 18, fontWeight: '800' },
  cartEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  cartLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  cartThumb: { width: 52, height: 52, borderRadius: 10 },
  cartLineName: { fontSize: 14, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  qtyVal: { fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  cartFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, marginTop: 8 },
  cartTotalLabel: { fontSize: 16, fontWeight: '600' },
  cartTotalVal: { fontSize: 22, fontWeight: '800' },
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  waBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  scheduleBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cartSectionLabel: { fontSize: 14, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  clientInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 8 },
  clientInputMulti: { minHeight: 64, textAlignVertical: 'top' },
  dateChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  slotsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  slotChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  bookDoneText: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  editBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  editBtnSmall: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  ownerHintText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
