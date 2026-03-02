import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { BankCardRealistic } from './BankCardRealistic';
import { playTapSound } from '../utils/sounds';

const { width: SW } = Dimensions.get('window');
const CARD_ASPECT_RATIO = 1.586;
const CAROUSEL_CARD_WIDTH = Math.min(SW * 0.88, SW - 56);
const CAROUSEL_CARD_HEIGHT = Math.round(CAROUSEL_CARD_WIDTH / CARD_ASPECT_RATIO);
const CAROUSEL_GAP = 12;
const CAROUSEL_PADDING = (SW - CAROUSEL_CARD_WIDTH) / 2;
const SNAP_INTERVAL = CAROUSEL_CARD_WIDTH + CAROUSEL_GAP;

export function BanksCarousel({
  banks,
  getBankName,
  getCardsByBankId,
  getBankGrad,
  profile,
  formatBankMoney,
  showValues = true,
  onCardPress,
  onEmptyPress,
  emptyContent,
  dotActiveColor = '#10b981',
  dotInactiveColor = 'rgba(107,114,128,0.5)',
}) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef(null);

  const carouselBanks = banks?.slice?.(0, 10) || [];

  useEffect(() => {
    setCarouselIndex(0);
  }, [banks?.length]);

  if (banks?.length === 0 && emptyContent) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          playTapSound();
          onEmptyPress?.();
        }}
        style={{ paddingHorizontal: 16 }}
      >
        {emptyContent}
      </TouchableOpacity>
    );
  }

  if (carouselBanks.length === 1) {
    const bank = carouselBanks[0];
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => {
          playTapSound();
          onCardPress?.(bank);
        }}
        style={{ alignSelf: 'center', paddingVertical: 12 }}
      >
        <BankCardRealistic
          bank={bank}
          cards={getCardsByBankId(bank.id)}
          profile={profile}
          getBankName={getBankName}
          formatBankMoney={formatBankMoney}
          showValues={showValues}
          width={CAROUSEL_CARD_WIDTH}
          height={CAROUSEL_CARD_HEIGHT}
          gradientColors={getBankGrad(bank)}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ paddingVertical: 12 }}>
      <View style={{ minHeight: CAROUSEL_CARD_HEIGHT + 40 }}>
        <FlatList
          ref={carouselRef}
          data={carouselBanks}
          horizontal
          pagingEnabled={false}
          snapToOffsets={carouselBanks.map((_, i) => i * SNAP_INTERVAL)}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: CAROUSEL_PADDING }}
          getItemLayout={(_, index) => ({ length: SNAP_INTERVAL, offset: index * SNAP_INTERVAL, index })}
          onMomentumScrollEnd={(e) =>
            setCarouselIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, SNAP_INTERVAL)))
          }
          keyExtractor={(b) => b.id}
          renderItem={({ item: bank }) => (
            <TouchableOpacity
              activeOpacity={0.95}
        onPress={() => {
          playTapSound();
          onCardPress?.(bank);
        }}
              style={{
                width: CAROUSEL_CARD_WIDTH,
                marginRight: CAROUSEL_GAP,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <BankCardRealistic
                bank={bank}
                cards={getCardsByBankId(bank.id)}
                profile={profile}
                getBankName={getBankName}
                formatBankMoney={formatBankMoney}
                showValues={showValues}
                width={CAROUSEL_CARD_WIDTH}
                height={CAROUSEL_CARD_HEIGHT}
                gradientColors={getBankGrad(bank)}
              />
            </TouchableOpacity>
          )}
        />
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          marginTop: 12,
        }}
      >
        {carouselBanks.map((_, i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === carouselIndex ? dotActiveColor : dotInactiveColor,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export { CAROUSEL_CARD_WIDTH, CAROUSEL_CARD_HEIGHT };
