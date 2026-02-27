import React from 'react';
import { TouchableOpacity } from 'react-native';
import { playTapSound } from '../utils/sounds';

export function TouchableWithSound({ onPress, ...props }) {
  return (
    <TouchableOpacity
      {...props}
      onPress={(e) => {
        playTapSound();
        onPress?.(e);
      }}
    />
  );
}
