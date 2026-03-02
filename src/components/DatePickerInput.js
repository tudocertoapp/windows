import React, { useState } from 'react';
import { TouchableOpacity, TextInput, Modal, View, Text, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export function DatePickerInput({ value, onChange, placeholder = 'DD/MM/YYYY', style, colors }) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(parseDate(value) || new Date());

  function parseDate(str) {
    if (!str || !str.trim()) return null;
    const parts = String(str).trim().split(/[/\-.]/);
    if (parts.length < 3) return null;
    const d = parseInt(parts[0], 10) || 1;
    const m = (parseInt(parts[1], 10) || 1) - 1;
    const y = parseInt(parts[2], 10) || new Date().getFullYear();
    return new Date(y, m, d);
  }

  function formatDate(d) {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const handleChange = (e, selected) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      setTempDate(selected);
      onChange?.(formatDate(selected));
    }
  };

  const openPicker = () => {
    const d = parseDate(value) || new Date();
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
                <DateTimePicker value={tempDate} mode="date" display="spinner" onChange={handleChange} locale="pt-BR" />
                <TouchableOpacity style={[s.iosBtn, { backgroundColor: colors?.primary }]} onPress={() => { handleChange(null, tempDate); setShow(false); }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>OK</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker value={tempDate} mode="date" display="default" onChange={handleChange} />
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
