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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/format';
import { CatalogoGradientFill } from '../../utils/catalogoGradient';
import {
  getEffectivePrice,
  getResponsiveGridColumns,
  getCatalogoTheme,
  getCatalogoRotulos,
  getCatalogoFontColors,
  getLojaDisplayName,
  getLojaLogoUri,
  buildHeroPresentation,
  getCarouselMetrics,
  resolveCarouselItems,
  isCarouselEnabled,
  getCarouselPosicao,
  getHeroOverlap,
  getCatalogoPageBg,
  getCarouselCapa,
  carouselCapaImageBox,
} from '../../utils/catalogoStore';
import { playTapSound } from '../../utils/sounds';
import { openWhatsApp } from '../../utils/whatsapp';
import { CarouselCoverEditor } from './CarouselCoverEditor';
import { LojaItemDetailModal } from './LojaItemDetailModal';
import { getNextAvailableDates } from '../../utils/agendaAvailability';
import { LojaAgendaPicker } from './LojaAgendaPicker';
import { LojaHeroBanner } from './LojaHeroBanner';
import { LojaHeroJunction } from './LojaHeroJunction';
import { ensureCatalogoFonts } from '../../utils/catalogoFonts';

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
  onPickLogo,
  ownerUserId,
  onCarouselCapaChange,
  layoutMode,
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
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const fadeLock = useRef(false);
  const carouselIndexRef = useRef(0);
  const [measuredW, setMeasuredW] = useState(0);
  const [mergeW, setMergeW] = useState(0);
  const [capaEdit, setCapaEdit] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  const agendamentoAtivo = config.agendamentoOnline !== false && !!onFetchAvailability;

  useEffect(() => {
    ensureCatalogoFonts(config);
  }, [config?.fontesUsuario]);

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
  const isMobileChrome = layoutMode === 'mobile' || (layoutMode !== 'desktop' && storeW > 0 && storeW < 640);
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

  const carouselItems = useMemo(() => {
    let list = items || [];
    if (config.tipo === 'produtos') list = list.filter((i) => i._tipo === 'produto');
    else if (config.tipo === 'servicos') list = list.filter((i) => i._tipo === 'servico');
    return resolveCarouselItems(config, list);
  }, [items, config.carouselScope, config.tipo, config.carouselItemIds]);
  const carousel = useMemo(
    () => getCarouselMetrics(config, storeW, pad),
    [config.carouselSize, config.carouselEstilo, config.carouselAnim, config.carouselSpeed, config.carouselVisiveis, config.carouselPosicao, storeW]
  );
  const showCarousel = isCarouselEnabled(config) && carouselItems.length > 0;
  const isLanding = config.layout === 'landing';
  const carouselPos = getCarouselPosicao(config);
  const carouselMerged = showCarousel && carouselPos === 'mesclado' && config.layout !== 'horizontal';
  const carouselBefore = showCarousel && !carouselMerged && carouselPos === 'antes-busca';
  const carouselAbove = showCarousel && !carouselMerged && carouselPos === 'acima';
  const carouselSide = showCarousel && !carouselMerged && carouselPos === 'lado';
  const carouselBelow = showCarousel && !carouselMerged && carouselPos === 'abaixo';
  const mergeSpan = cols >= 3 ? 2 : Math.max(1, cols);
  const catalogList = useMemo(() => {
    if (!carouselMerged) return filtered;
    const ids = new Set(carouselItems.map((i) => i._rowId || i.id));
    return filtered.filter((i) => !ids.has(i._rowId || i.id));
  }, [carouselMerged, filtered, carouselItems]);

  const carouselCardHeight = useMemo(() => {
    let body = 16;
    body += 38;
    if (config.mostrarPrecos !== false) body += 22;
    if (interactive && config.mostrarCarrinho !== false && !carousel.compact) body += 40;
    return (carousel.stageH || carousel.imgH) + (carousel.compact ? 28 : body);
  }, [config.mostrarPrecos, config.mostrarCarrinho, interactive, carousel.imgH, carousel.stageH, carousel.compact]);

  const carouselStep = (carouselMerged && mergeW > 0) ? mergeW : carousel.step;

  carouselIndexRef.current = carouselIndex;

  const goCarousel = useCallback((next) => {
    const len = carouselItems.length;
    if (len <= 1) return;
    const idx = ((next % len) + len) % len;
    if (carousel.fade) {
      if (fadeLock.current) return;
      fadeLock.current = true;
      Animated.timing(fadeAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        setCarouselIndex(idx);
        Animated.timing(fadeAnim, { toValue: 1, duration: 340, useNativeDriver: true }).start(() => {
          fadeLock.current = false;
        });
      });
      return;
    }
    setCarouselIndex(idx);
    carouselRef.current?.scrollToOffset({ offset: idx * carouselStep, animated: true });
  }, [carousel.fade, carouselItems.length, carouselStep, fadeAnim]);

  useEffect(() => {
    if (!showCarousel || !config.carouselAuto || carouselItems.length <= carousel.visiveis) return;
    const t = setInterval(() => {
      goCarousel(carouselIndexRef.current + 1);
    }, carousel.interval);
    return () => clearInterval(t);
  }, [showCarousel, config.carouselAuto, carouselItems.length, carousel.visiveis, carousel.interval, goCarousel]);

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

  const openItemDetail = (item) => {
    if (!interactive || !item) return;
    playTapSound();
    setDetailItem(item);
  };

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
        onPress={(e) => { e?.stopPropagation?.(); playTapSound(); onEditItem(item); }}
        hitSlop={8}
      >
        <Ionicons name="pencil" size={14} color="#fff" />
      </TouchableOpacity>
    );
  };

  const renderProductCard = (item, opts = {}) => {
    const { fullWidth, carousel: asCarousel, cardWidth } = opts;
    const photo = getItemPhoto(item);
    const rowId = item._rowId || `${item._tipo}:${item.id}`;
    const capa = asCarousel ? getCarouselCapa(config, rowId) : null;
    const w = cardWidth || (fullWidth ? '100%' : asCarousel ? carousel.itemW : cardW);
    const h = asCarousel ? carousel.imgH : cardH * 0.55;
    const fade = asCarousel && (carousel.anim === 'destaque' || carousel.anim === 'zoom');
    const active = carouselItems.findIndex((i) => (i._rowId || i.id) === (item._rowId || item.id)) === carouselIndex;
    const capaBox = asCarousel && photo ? carouselCapaImageBox(capa, carousel.imgW, carousel.imgH) : null;
    const cliqueDetalhe = interactive && (!asCarousel || config.carouselCliqueDetalhe !== false);
    const hideCarouselCart = asCarousel && (config.carouselCliqueDetalhe !== false || carousel.compact);
    const stockN = item._tipo === 'servico' ? null : Number(item.stock);
    const showStock = asCarousel && config.carouselMostrarEstoque && Number.isFinite(stockN);
    const CardWrap = cliqueDetalhe ? Pressable : View;
    return (
      <CardWrap
        key={item._rowId || item.id}
        onPress={cliqueDetalhe ? () => openItemDetail(item) : undefined}
        style={[
          st.card,
          asCarousel && st.cardCarousel,
          {
            width: w,
            minHeight: asCarousel ? undefined : cardH,
            backgroundColor: asCarousel ? 'transparent' : cardBg,
            borderColor: asCarousel ? 'transparent' : config.corPrincipal + '22',
            borderWidth: asCarousel ? 0 : 1,
            borderRadius: asCarousel ? carousel.radius : 14,
            overflow: asCarousel ? 'visible' : 'hidden',
            opacity: fade && asCarousel && !carousel.fade ? (active ? 1 : 0.55) : 1,
            transform: fade && !active && !carousel.fade ? [{ scale: 0.94 }] : undefined,
          },
        ]}
      >
        {photo ? (
          <View style={asCarousel ? [st.carouselStage, { height: carousel.stageH || h }] : { position: 'relative' }}>
            {asCarousel ? (
              <View style={[st.carouselFrame, { width: carousel.imgW, height: carousel.imgH, borderRadius: carousel.radius }]}>
                <Image source={{ uri: photo }} style={capaBox} resizeMode="cover" />
                {ownerMode && onCarouselCapaChange ? (
                  <TouchableOpacity
                    style={[st.capaBtn, carousel.compact && { width: 22, height: 22, right: 4, bottom: 4 }, { backgroundColor: config.corPrincipal }]}
                    onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setCapaEdit({ item, uri: photo, rowId }); }}
                    hitSlop={8}
                  >
                    <Ionicons name="crop-outline" size={carousel.compact ? 12 : 14} color="#fff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <Image source={{ uri: photo }} style={[st.cardImg, { height: h }]} resizeMode="cover" />
            )}
            {renderEditBtn(item)}
          </View>
        ) : (
          <View style={asCarousel
            ? [st.carouselStage, { height: carousel.stageH || h }]
            : [st.cardImg, st.cardImgPh, { height: h, backgroundColor: config.corPrincipal + '18' }]}
          >
            <View style={asCarousel
              ? [st.carouselImg, st.cardImgPh, { width: carousel.imgW, height: carousel.imgH, borderRadius: carousel.radius, backgroundColor: config.corPrincipal + '18' }]
              : undefined}
            >
              <Ionicons name={item._tipo === 'servico' ? 'construct' : 'cube'} size={asCarousel ? 40 : 32} color={config.corPrincipal} />
            </View>
            {renderEditBtn(item)}
          </View>
        )}
        <View style={[st.cardBody, asCarousel && st.cardBodyCarousel, asCarousel && { alignItems: 'center' }]}>
          <Text
            style={[
              st.cardName,
              asCarousel && carousel.compact && { fontSize: 11, lineHeight: 14 },
              { color: fonts.produto, textAlign: asCarousel ? 'center' : 'left' },
            ]}
            numberOfLines={carousel.compact ? 1 : 2}
          >
            {item.name}
          </Text>
          {(!asCarousel || config.carouselMostrarPreco !== false) ? renderPrice(item) : null}
          {showStock ? (
            <Text style={[st.stockLine, { color: stockN > 0 ? fonts.produto : '#ef4444' }]} numberOfLines={1}>
              {stockN > 0 ? `${stockN} un.` : 'Esgotado'}
            </Text>
          ) : null}
          {interactive && config.mostrarCarrinho !== false && !hideCarouselCart && (
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
      </CardWrap>
    );
  };

  const renderListItem = (item) => {
    const photo = getItemPhoto(item);
    return (
      <Pressable key={item._rowId || item.id} onPress={() => openItemDetail(item)} style={[st.listRow, { borderColor: config.corPrincipal + '22', backgroundColor: cardBg }]}>
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
      </Pressable>
    );
  };

  const renderLandingItem = (item) => {
    const photo = getItemPhoto(item);
    return (
      <Pressable key={item._rowId || item.id} onPress={() => openItemDetail(item)} style={[st.landingCard, { borderColor: config.corPrincipal + '22', backgroundColor: cardBg }]}>
        <View style={{ position: 'relative' }}>
          {photo ? (
            <Image source={{ uri: photo }} style={st.landingImg} resizeMode="cover" />
          ) : (
            <View style={[st.landingImg, st.cardImgPh, { backgroundColor: config.corPrincipal + '18' }]}>
              <Ionicons name={item._tipo === 'servico' ? 'construct' : 'cube'} size={40} color={config.corPrincipal} />
            </View>
          )}
          {renderEditBtn(item)}
        </View>
        <View style={st.landingBody}>
          <Text style={[st.landingName, { color: fonts.produto }]}>{item.name}</Text>
          {renderPrice(item)}
          {interactive && config.mostrarCarrinho !== false && (
            <TouchableOpacity
              style={[st.addBtn, { backgroundColor: config.corPrincipal }]}
              onPress={() => { playTapSound(); onAddToCart?.(item); }}
              activeOpacity={0.85}
            >
              <Ionicons name="cart-outline" size={16} color="#fff" />
              <Text style={st.addBtnText}>Adicionar</Text>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    );
  };

  const renderCarousel = (opts = {}) => {
    const embedded = !!opts.embedded;
    const trackW = opts.width > 0 ? opts.width : carousel.itemW;
    const step = Math.max(1, Number(trackW) || carousel.step);
    const vis = Math.max(1, carousel.visiveis || 1);
    const fadeItems = [];
    if (carousel.fade && carouselItems.length) {
      for (let i = 0; i < vis; i += 1) {
        fadeItems.push(carouselItems[(carouselIndex + i) % carouselItems.length]);
      }
    }
    const zoom = carousel.anim === 'zoom';
    return (
      <View style={[st.secao, embedded && { marginTop: 0 }]}>
        {carousel.fade ? (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: zoom ? [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] : undefined,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: carousel.gap || 12,
              minHeight: carouselCardHeight,
            }}
          >
            {fadeItems.map((item) => renderProductCard(item, { carousel: true, cardWidth: trackW }))}
          </Animated.View>
        ) : (
          <FlatList
            ref={carouselRef}
            data={carouselItems}
            horizontal
            pagingEnabled={carousel.paging}
            snapToInterval={step}
            snapToAlignment="start"
            decelerationRate={carousel.anim === 'suave' ? 'normal' : 'fast'}
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            style={{ height: carouselCardHeight }}
            contentContainerStyle={{
              paddingRight: carousel.gap || 0,
              justifyContent: vis === 1 ? 'center' : 'flex-start',
            }}
            ItemSeparatorComponent={carousel.gap ? () => <View style={{ width: carousel.gap }} /> : undefined}
            keyExtractor={(i) => i._rowId || String(i.id)}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / step);
              setCarouselIndex(Math.min(Math.max(0, idx), carouselItems.length - 1));
            }}
            renderItem={({ item }) => renderProductCard(item, { carousel: true, cardWidth: opts.width > 0 ? opts.width : undefined })}
          />
        )}
        {carouselItems.length > 1 && (
          <View style={st.dots}>
            {carouselItems.map((_, i) => (
              <View key={i} style={[st.dot, { backgroundColor: carouselIndex === i ? config.corPrincipal : config.corTexto + '33' }]} />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderGrid = (list) => (
    <View style={[st.grid, { marginHorizontal: -gap / 2, paddingTop: (showCarousel && !carouselBelow) ? 2 : 8, paddingBottom: 8 }]}>
      {carouselMerged ? (
        <View
          style={{ width: `${(100 * mergeSpan) / cols}%`, paddingHorizontal: gap / 2, marginBottom: gap, boxSizing: 'border-box' }}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== mergeW) setMergeW(w);
          }}
        >
          {renderCarousel({ embedded: true, width: mergeW })}
        </View>
      ) : null}
      {list.map((item) => (
        <View
          key={item._rowId || item.id}
          style={{ width: `${100 / cols}%`, paddingHorizontal: gap / 2, marginBottom: gap, boxSizing: 'border-box' }}
        >
          {renderProductCard(item, { fullWidth: true })}
        </View>
      ))}
    </View>
  );

  const renderCatalog = () => {
    if (filtered.length === 0 && !carouselMerged) {
      return (
        <View style={st.empty}>
          <Ionicons name="bag-outline" size={48} color={config.corTexto + '44'} />
          <Text style={{ color: config.corTexto + '88', textAlign: 'center' }}>{rotulos.vazio}</Text>
        </View>
      );
    }
    if (isLanding) {
      return (
        <View style={{ gap: 16, paddingVertical: 8 }}>
          {carouselMerged ? renderCarousel({ embedded: true, width: innerW }) : null}
          {catalogList.map(renderLandingItem)}
        </View>
      );
    }
    if (config.layout === 'horizontal') {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap, paddingVertical: 8 }}>
          {filtered.map((item) => renderProductCard(item, { fullWidth: false }))}
        </ScrollView>
      );
    }
    if (config.layout === 'vertical') {
      return (
        <View style={{ gap: 10, paddingVertical: 8 }}>
          {carouselMerged ? renderCarousel({ embedded: true, width: innerW }) : null}
          {catalogList.map(renderListItem)}
        </View>
      );
    }
    return renderGrid(catalogList);
  };

  const heroBg = config.usaFotoFundo && config.fotoFundo
    ? { uri: config.fotoFundo }
    : null;

  const hero = useMemo(() => buildHeroPresentation(config), [config]);
  const overlap = useMemo(() => getHeroOverlap(config), [config]);
  const pageBg = useMemo(() => getCatalogoPageBg(config), [config]);
  const pageFill = pageBg.solid;

  const handleHeroPositionChange = useCallback((id, pos) => {
    onHeroPositionChange?.(id, pos);
  }, [onHeroPositionChange]);

  return (
    <View
      style={[st.root, isLanding && st.rootLanding, { backgroundColor: pageFill }]}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== measuredW) setMeasuredW(w);
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={!heroDragging}
        nestedScrollEnabled
        contentContainerStyle={{ paddingBottom: isMobileChrome && config.mostrarCarrinho !== false ? 88 : 24 }}
        style={heroDragging ? { overflow: 'hidden' } : undefined}
      >
        <View>
          <LojaHeroBanner
            config={config}
            hero={hero}
            lojaNome={lojaNome}
            logoUri={logoUri}
            heroBg={heroBg}
            heroEditMode={ownerMode}
            heroResizeMode={ownerMode}
            onHeroPositionChange={handleHeroPositionChange}
            onHeroScaleChange={onHeroScaleChange}
            onHeroTextChange={onHeroTextChange}
            onPickLogo={ownerMode ? onPickLogo : undefined}
            onDragStateChange={setHeroDragging}
            ownerUserId={ownerUserId}
          />
          {overlap.shape ? (
            <LojaHeroJunction
              shape={overlap.shape}
              fill={pageFill}
              height={overlap.cutH}
              inset={hero.frame?.mh || 0}
            />
          ) : null}
        </View>

        <CatalogoGradientFill
          cores={pageBg.usarGradiente ? pageBg.cores : [pageBg.solid, pageBg.solid]}
          stops={pageBg.usarGradiente ? pageBg.stops : undefined}
          look={pageBg.look}
          style={overlap.sheet}
        >
        {config.mostrarSobre !== false && config.sobreTexto ? (
          <View style={[st.about, isLanding && st.aboutLanding, { backgroundColor: cardBg, borderColor: config.corPrincipal + '22' }]}>
            <Text style={[st.aboutText, isLanding && st.aboutTextLanding, { color: fonts.sobre }]}>{config.sobreTexto}</Text>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: isLanding ? 16 : pad, paddingTop: overlap.id === 'nenhuma' ? (isLanding ? 8 : 0) : 4 }}>
          {carouselBefore ? renderCarousel() : null}

          <View style={[st.searchWrap, isLanding && st.searchLanding, { borderColor: config.corPrincipal + '33', backgroundColor: cardBg }]}>
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

          {carouselSide ? (
            <View style={[st.sideWrap, storeW < 720 && { flexDirection: 'column' }]}>
              <View style={[st.sideCarousel, storeW < 720 && { width: '100%' }]}>{renderCarousel()}</View>
              <View style={st.sideCatalog}>{renderCatalog()}</View>
            </View>
          ) : (
            <>
              {carouselAbove ? renderCarousel() : null}
              {renderCatalog()}
              {carouselBelow ? renderCarousel() : null}
            </>
          )}
        </View>
        </CatalogoGradientFill>
      </ScrollView>

      {interactive && config.mostrarCarrinho !== false && !isMobileChrome ? (
        <View style={st.topFabs}>
          {config.mostrarWhatsApp !== false && (config.whatsappPedido || profile?.telefone) ? (
            <TouchableOpacity
              style={[st.cartFabTop, { backgroundColor: '#25D366', position: 'relative', top: 0, right: 0 }]}
              onPress={() => {
                playTapSound();
                openWhatsApp(
                  config.whatsappPedido || profile?.telefone,
                  `Olá! Vim pela loja de ${getLojaDisplayName(config, profile)}.`,
                );
              }}
              activeOpacity={0.88}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[st.cartFabTop, { backgroundColor: config.corPrincipal, position: 'relative', top: 0, right: 0 }]}
            onPress={() => { playTapSound(); setCartOpen(true); }}
            activeOpacity={0.88}
          >
            <Ionicons name="cart" size={22} color="#fff" />
            {cartCount > 0 ? (
              <View style={st.cartBadge}>
                <Text style={st.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      ) : null}
      {interactive && config.mostrarCarrinho !== false && isMobileChrome ? (
        <TouchableOpacity
          style={[st.bottomCartBar, { backgroundColor: config.corPrincipal }]}
          onPress={() => { playTapSound(); setCartOpen(true); }}
          activeOpacity={0.9}
        >
          <Ionicons name="cart" size={22} color="#fff" />
          <Text style={st.bottomCartText}>Carrinho</Text>
          {cartCount > 0 ? (
            <View style={st.bottomCartBadge}>
              <Text style={st.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}

      {interactive && config.mostrarCarrinho !== false && (
        <Modal visible={cartOpen} transparent animationType="slide" onRequestClose={() => setCartOpen(false)}>
            <Pressable style={st.cartOverlay} onPress={() => setCartOpen(false)}>
              <Pressable style={[st.cartSheet, { backgroundColor: cardBg }]} onPress={(e) => e.stopPropagation()}>
                <View style={st.cartHeader}>
                  <Text style={[st.cartTitle, { color: config.corTexto }]}>Seu carrinho</Text>
                  {config.mostrarWhatsApp !== false && (config.whatsappPedido || profile?.telefone) ? (
                    <TouchableOpacity
                      style={st.cartWaIcon}
                      onPress={() => {
                        playTapSound();
                        openWhatsApp(
                          config.whatsappPedido || profile?.telefone,
                          `Olá! Vim pela loja de ${getLojaDisplayName(config, profile)}.`,
                        );
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                    </TouchableOpacity>
                  ) : null}
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
      )}
      <CarouselCoverEditor
        visible={!!capaEdit}
        uri={capaEdit?.uri}
        value={getCarouselCapa(config, capaEdit?.rowId)}
        colors={{
          card: cardBg,
          border: config.corPrincipal + '33',
          text: config.corTexto,
          textSecondary: config.corTexto,
        }}
        accent={config.corPrincipal}
        onClose={() => setCapaEdit(null)}
        onSave={(capa) => {
          if (capaEdit?.rowId) onCarouselCapaChange?.(capaEdit.rowId, capa);
          setCapaEdit(null);
        }}
      />
      <LojaItemDetailModal
        visible={!!detailItem}
        item={detailItem}
        config={config}
        fonts={fonts}
        cardBg={cardBg}
        mostrarEstoque={!!config.carouselMostrarEstoque}
        mostrarCarrinho={interactive && config.mostrarCarrinho !== false}
        onAddToCart={onAddToCart}
        onClose={() => setDetailItem(null)}
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, borderRadius: 16, overflow: 'visible' },
  rootLanding: { borderRadius: 0 },
  about: { margin: 16, marginBottom: 0, padding: 16, borderRadius: 12, borderWidth: 1 },
  aboutLanding: { marginHorizontal: 16, marginTop: 18, padding: 20, borderRadius: 20 },
  aboutText: { fontSize: 14, lineHeight: 22 },
  aboutTextLanding: { fontSize: 16, lineHeight: 26, textAlign: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchLanding: { borderRadius: 999, marginTop: 6, paddingVertical: 12 },
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
  secao: { marginTop: 20, overflow: 'visible' },
  secaoTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 22, marginBottom: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 0, width: '100%' },
  cardCarousel: { marginBottom: 0, alignItems: 'center' },
  cardBodyCarousel: { paddingTop: 8, paddingHorizontal: 10, paddingBottom: 8, width: '100%' },
  carouselStage: { width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  carouselFrame: { overflow: 'hidden', alignSelf: 'center', position: 'relative', backgroundColor: '#0f172a' },
  capaBtn: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  carouselImg: { maxWidth: '100%' },
  sideWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8 },
  sideCarousel: { width: '48%', flexShrink: 0 },
  sideCatalog: { flex: 1, minWidth: 0 },
  topFabs: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartFabTop: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 40,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
  },
  bottomCartBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 40,
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
  },
  bottomCartText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  bottomCartBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartWaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D36622',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImg: { width: '100%' },
  cardImgPh: { justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 10, gap: 4 },
  cardName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  priceOld: { fontSize: 11, textDecorationLine: 'line-through' },
  price: { fontSize: 15, fontWeight: '800' },
  stockLine: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  promoBadge: { backgroundColor: '#ef4444', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  promoText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 12 },
  listImg: { width: 64, height: 64, borderRadius: 10 },
  listInfo: { flex: 1 },
  listAdd: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  landingCard: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  landingImg: { width: '100%', height: 240 },
  landingBody: { padding: 16, gap: 8 },
  landingName: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
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
  cartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cartTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
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
