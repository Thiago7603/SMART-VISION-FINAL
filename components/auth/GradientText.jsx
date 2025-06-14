import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import theme from './../../constants/theme'; 

export default function GradientText({ text }) {
  return (
    <MaskedView
      maskElement={
        <Text style={[styles.title, { color: theme.COLORS.black }]}>{text}</Text>
      }
    >
      <LinearGradient
        colors={[theme.COLORS.primary, theme.COLORS.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[styles.title, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: theme.SIZES.md,
    fontWeight: '900',
  },
});