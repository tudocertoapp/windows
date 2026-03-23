import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';

export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      const msg = String(this.state.error?.message || this.state.error || 'Erro desconhecido');
      const stack = this.state.error?.stack || '';
      return (
        <View style={s.container}>
          <Text style={s.title}>Algo deu errado</Text>
          <ScrollView style={s.scroll}>
            <Text style={s.error}>{msg}</Text>
            {__DEV__ || Platform.OS === 'web' ? (
              <Text style={s.stack} selectable>{stack}</Text>
            ) : null}
          </ScrollView>
          <TouchableOpacity style={s.btn} onPress={() => this.setState({ error: null })}>
            <Text style={s.btnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  scroll: {
    maxHeight: 300,
    marginBottom: 24,
  },
  error: {
    color: '#fca5a5',
    fontSize: 14,
    marginBottom: 12,
  },
  stack: {
    color: '#9ca3af',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  btn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
