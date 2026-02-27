import React, { useRef, useEffect } from 'react';
import { View, Animated, Vibration, Pressable } from 'react-native';

const LONG_PRESS_MS = 3000;
const FLOAT_SCALE = 1.03;

export function DraggableCard({ id, editMode, children, onLayoutMeasured, onFloatStart, onCardPress, isFloating }) {
  const viewRef = useRef(null);
  const scale = useRef(new Animated.Value(1)).current;
  const lastLongPressTime = useRef(0);

  const resetCard = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = () => {
    if (!editMode) return;
    lastLongPressTime.current = Date.now();
    onFloatStart?.(id);
    Vibration.vibrate(15);
    Animated.timing(scale, {
      toValue: FLOAT_SCALE,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!editMode) return;
    if (isFloating && Date.now() - lastLongPressTime.current < 400) return;
    onCardPress?.(id);
    if (isFloating) resetCard();
  };

  const handleLayout = () => {
    viewRef.current?.measureInWindow((x, y, w, h) => {
      onLayoutMeasured?.(id, y, h);
    });
  };

  useEffect(() => {
    if (!isFloating) resetCard();
  }, [isFloating]);

  if (!editMode) {
    return <View ref={viewRef} onLayout={handleLayout} collapsable={false}>{children}</View>;
  }

  return (
    <Animated.View
      ref={viewRef}
      onLayout={handleLayout}
      style={[
        { transform: [{ scale }] },
        isFloating && {
          zIndex: 1000,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
      ]}
      collapsable={false}
    >
      <Pressable
        delayLongPress={LONG_PRESS_MS}
        onLongPress={handleLongPress}
        onPress={handlePress}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
