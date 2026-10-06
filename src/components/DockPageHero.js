import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { DockVoiceSphere } from './DockVoiceSphere';

const CHAR = require('../../assets/dock/page/character.png');
const SILH = require('../../assets/dock/page/silhouette.png');
const VISOR = require('../../assets/dock/page/visor.png');
const RATIO = 600 / 823;

function visorMaskStyle(uri) {
  if (Platform.OS !== 'web' || !uri) return {};
  return {
    WebkitMaskImage: `url("${uri}")`,
    maskImage: `url("${uri}")`,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskMode: 'alpha',
    maskMode: 'alpha',
  };
}

export function DockPageHero({
  characterSize = 248,
  spectrumSize = 320,
  spectrumId,
  speaking = false,
  listening = false,
}) {
  const h = Number(characterSize) || 248;
  const w = Math.round(h * RATIO);
  const visorSrc = Image.resolveAssetSource ? Image.resolveAssetSource(VISOR) : null;
  const visorUri = visorSrc?.uri || (typeof VISOR === 'string' ? VISOR : '');
  const visorCx = w * 0.5816;
  const visorCy = h * 0.318;
  const inner = Math.round(Math.max(w * 0.633, h * 0.397) * 1.5);
  const left = Math.round(visorCx - inner / 2);
  const top = Math.round(visorCy - inner / 2);

  return (
    <View style={[styles.well, { width: spectrumSize, height: spectrumSize }]} pointerEvents="none">
      <DockVoiceSphere
        size={spectrumSize}
        spectrumId={spectrumId}
        speaking={speaking}
        listening={listening}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={{ width: w, height: h }}>
          <Image source={SILH} resizeMode="contain" style={[styles.layer, { width: w, height: h }]} />
          <View style={[styles.layer, { width: w, height: h, overflow: 'hidden' }, visorMaskStyle(visorUri)]}>
            <View
              style={{
                position: 'absolute',
                left,
                top,
                width: inner,
                height: inner,
              }}
            >
              <DockVoiceSphere
                size={inner}
                spectrumId={spectrumId}
                speaking={speaking}
                listening={listening}
              />
            </View>
          </View>
          <Image source={CHAR} resizeMode="contain" style={[styles.layer, { width: w, height: h }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
