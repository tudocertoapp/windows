import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, PanResponder, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';

const { width: SW, height: SH } = Dimensions.get('window');

const ROTATION_BASE_DURATION = 22000;
const RADIUS = 140;

export function CircularMenuComponent({ isOpen, onClose, onAddType, onAssistant }) {
  const { primaryColor, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const gestureDx = useRef(new Animated.Value(0)).current;
  const gestureRotate = useRef(new Animated.Value(0)).current;
  const gestureValueRef = useRef(0);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const btnRotateAnim = useRef(new Animated.Value(0)).current;
  const [rotationDirection, setRotationDirection] = useState(1);
  const [rotationSpeed, setRotationSpeed] = useState(1);

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
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(btnRotateAnim, { toValue: 1, duration: 450, useNativeDriver: true, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(btnRotateAnim, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      ]).start();
      rotateAnim.setValue(0);
      gestureRotate.setValue(0);
      gestureDx.setValue(0);
      gestureValueRef.current = 0;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const dir = rotationDirection;
    const speed = Math.max(0.3, Math.min(3, rotationSpeed));
    const dur = ROTATION_BASE_DURATION / speed;
    const loop = () => {
      Animated.timing(rotateAnim, {
        toValue: dir > 0 ? 360 : -360,
        duration: dur,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && isOpen) {
          rotateAnim.setValue(0);
          loop();
        }
      });
    };
    loop();
  }, [isOpen, rotationDirection, rotationSpeed]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderGrant: () => {
        gestureDx.setValue(0);
        gestureValueRef.current = 0;
      },
      onPanResponderMove: Animated.event([null, { dx: gestureDx }], { useNativeDriver: true }),
      onPanResponderRelease: (_, ev) => {
        const { dx, vx } = ev.nativeEvent;
        gestureValueRef.current = dx * 0.8 + (vx || 0) * 100;
        gestureDx.setValue(0);
        setRotationDirection((vx || dx) > 0 ? -1 : 1);
        setRotationSpeed(Math.min(3, Math.max(0.5, 0.7 + Math.abs(vx || dx / 100) * 1.5)));
        Animated.timing(gestureRotate, {
          toValue: gestureValueRef.current,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          gestureRotate.setValue(0);
          gestureValueRef.current = 0;
        });
      },
    })
  ).current;

  const gestureRotation = Animated.multiply(gestureDx, 0.85);
  const totalDeg = Animated.add(rotateAnim, Animated.add(gestureRotate, gestureRotation));
  const totalSpin = totalDeg.interpolate({
    inputRange: [-3600, 3600],
    outputRange: ['-3600deg', '3600deg'],
  });
  const counterSpin = totalDeg.interpolate({
    inputRange: [-3600, 3600],
    outputRange: ['3600deg', '-3600deg'],
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
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: opacityAnim }]} />
      </View>
      <View style={[styles.hintTop, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.hintText, { color: colors.text }]}>
          Arraste o que você quer cadastrar para o microfone
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
        {...panResponder.panHandlers}
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
