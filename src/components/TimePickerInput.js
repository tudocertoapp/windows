import React, { useState } from 'react';
import { TouchableOpacity, TextInput, Modal, View, Text, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export function TimePickerInput({ value, onChange, placeholder = 'HH:MM', style, colors }) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(parseTime(value) || new Date());

  function parseTime(str) {
    if (!str || !str.trim()) return null;
    const parts = String(str).trim().split(/[:h]/i);
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const d = new Date();
    d.setHours(Math.min(23, Math.max(0, h)), Math.min(59, Math.max(0, m)), 0, 0);
    return d;
  }

  function formatTime(d) {
    if (!d) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  const handleChange = (e, selected) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      setTempDate(selected);
      onChange?.(formatTime(selected));
    }
  };

  const openPicker = () => {
    const d = parseTime(value) || new Date();
    setTempDate(d);
    setShow(true);
  };

  return (
    <>
      <TouchableOpacity onPress={openPicker} activeOpacity={0.8}>
        <TextInput
          style={[{ borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }, style, { borderColor: colors?.border, color: colors?.text, backgroundColor: colors?.bg, pointerEvents: 'none' }]}
          value={value || ''}
          placeholder={placeholder}
          placeholderTextColor={colors?.textSecondary}
          editable={false}
        />
      </TouchableOpacity>
      {show && (
        Platform.OS === 'ios' ? (
          <Modal transparent visible>
            <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShow(false)}>
              <View style={[s.iosBox, { backgroundColor: colors?.card || '#1f2937' }]}>
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={handleChange}
                  locale="pt-BR"
                  textColor={colors?.text || '#1f2937'}
                  themeVariant={colors?.isDarkBg ? 'dark' : 'light'}
                  accentColor={colors?.primary}
                />
                <TouchableOpacity style={[s.iosBtn, { backgroundColor: colors?.primary }]} onPress={() => { handleChange(null, tempDate); setShow(false); }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>OK</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="time"
            display="default"
            onChange={handleChange}
            themeVariant={colors?.isDarkBg ? 'dark' : 'light'}
            accentColor={colors?.primary}
          />
        )
      )}
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  iosBox: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 20, paddingBottom: 40 },
  iosBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
});
