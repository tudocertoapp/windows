import React, { useState } from 'react';
import { TouchableOpacity, TextInput, Modal, View, Text, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export function TimePickerInput({ value, onChange, placeholder = 'HH:MM', style, colors }) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(parseTime(value) || new Date());

  function parseTime(str) {
    if (!str || !str.trim()) return null;
    const parts = String(str).trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const d = new Date();
    d.setHours(h, m, 0, 0);
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
          style={[{ borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }, style, { borderColor: colors?.border, color: colors?.text, backgroundColor: colors?.bg }]}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={colors?.textSecondary}
          editable={false}
          pointerEvents="none"
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
                  textColor={colors?.text || '#1f2937'}
                  themeVariant={colors?.bg === '#111827' ? 'dark' : 'light'}
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
            themeVariant={colors?.bg === '#111827' ? 'dark' : 'light'}
            accentColor={colors?.primary}
          />
        )
      )}
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  iosBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  iosBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
});
