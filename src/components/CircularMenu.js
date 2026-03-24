import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';
import { useNativeDriverSafe } from '../utils/platformLayout';

const { width: SW, height: SH } = Dimensions.get('window');

const ROTATION_DURATION = 28000;
const RADIUS = 140;

export function CircularMenuComponent({ isOpen, onClose, onAddType, onAssistant }) {
  const { primaryColor, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const btnRotateAnim = useRef(new Animated.Value(0)).current;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const items = [
    { id: 'receita', label: 'Receita', icon: 'trending-up-outline', color: primaryColor },
    { id: 'despesa', label: 'Despesa', icon: 'trending-down-outline', color: '#ef4444' },
    { id: 'fatura', label: 'Fatura', icon: 'document-text-outline', color: '#f59e0b' },
    { id: 'cliente', label: 'Cliente', icon: 'people-outline', color: '#3b82f6' },
    { id: 'agenda', label: 'Agenda', icon: 'calendar-outline', color: '#f59e0b' },
    { id: 'produto', label: 'Produto', icon: 'cube-outline', color: '#8b5cf6' },
    { id: 'servico', label: 'Serviço', icon: 'construct-outline', color: '#ec4899' },
    { id: 'tarefa', label: 'Tarefa', icon: 'checkbox-outline', color: '#06b6d4' },
    { id: 'fornecedor', label: 'Fornecedor', icon: 'business-outline', color: '#10b981' },
  ];

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: useNativeDriverSafe, tension: 80, friction: 10 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: useNativeDriverSafe }),
        Animated.timing(btnRotateAnim, { toValue: 1, duration: 450, useNativeDriver: useNativeDriverSafe, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0, useNativeDriver: useNativeDriverSafe }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: useNativeDriverSafe }),
        Animated.timing(btnRotateAnim, { toValue: 0, duration: 300, useNativeDriver: useNativeDriverSafe, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      ]).start();
      rotateAnim.setValue(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const loop = () => {
      Animated.timing(rotateAnim, {
        toValue: 360,
        duration: ROTATION_DURATION,
        useNativeDriver: useNativeDriverSafe,
      }).start(({ finished }) => {
        if (finished && isOpenRef.current) {
          rotateAnim.setValue(0);
          loop();
        }
      });
    };
    loop();
  }, [isOpen]);

  const totalSpin = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });
  const counterSpin = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '-360deg'],
  });

  const angleStep = 360 / items.length;
  const btnRotateDeg = btnRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });
  const fabBottom = 44 + (44 + insets.bottom) / 2 - 27.5 + 62;

  const handleItemTap = (id) => {
    playTapSound();
    onAddType?.(id);
    onClose();
  };

  const handleItemLongPress = (id) => {
    playTapSound();
    onAddType?.(id);
    onAssistant?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal transparent visible={isOpen} animationType="none">
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: opacityAnim }]} />
      </View>
      <View style={[styles.hintTop, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.hintText, { color: colors.text }]}>
          Toque no que você quer cadastrar
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.fabBtn, { backgroundColor: primaryColor, bottom: fabBottom }]}
        onPress={() => { playTapSound(); onClose(); }}
        activeOpacity={0.9}
      >
        <Animated.View style={{ transform: [{ rotate: btnRotateDeg }] }}>
          <Ionicons name="add" size={28} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View
        style={{
          position: 'absolute',
          left: SW / 2 - RADIUS - 40,
          top: SH / 2 - RADIUS - 70,
          width: (RADIUS + 40) * 2,
          height: (RADIUS + 40) * 2,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ scale: scaleAnim }],
        }}
        collapsable={false}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: 36,
            width: (RADIUS + 40) * 2,
            height: (RADIUS + 40) * 2,
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ rotate: totalSpin }],
          }}
        >
          {items.map((item, i) => {
            const angleDeg = angleStep * i - 90;
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = Math.cos(angleRad) * RADIUS;
            const y = Math.sin(angleRad) * RADIUS;
            return (
              <Animated.View
                key={item.id}
                style={{
                  position: 'absolute',
                  alignItems: 'center',
                  transform: [{ translateX: x }, { translateY: y }, { rotate: counterSpin }],
                }}
              >
                <TouchableOpacity
                  style={styles.itemBtn}
                  onPress={() => handleItemTap(item.id)}
                  onLongPress={() => handleItemLongPress(item.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={item.icon} size={28} color={item.color} />
                  <Text style={[styles.itemLabel, { color: item.color }]}>{item.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: SW / 2 - 36, top: SH / 2 - 36, transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={styles.micBtn}
          onPress={onAssistant}
          activeOpacity={0.9}
        >
          <Ionicons name="mic" size={30} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hintTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  hintText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  itemBtn: {
    minWidth: 54,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  itemLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  fabBtn: {
    position: 'absolute',
    left: SW / 2 - 27.5,
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    zIndex: 30,
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
});
