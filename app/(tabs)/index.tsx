import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';


export default function HomeScreen() {
  const [name, setName] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>Student Copilot</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>✦ AI-POWERED STUDY COMPANION</Text>
        </View>

        <Text style={styles.title}>
          Study smarter.{'\n'}
          <Text style={styles.highlight}>Not harder.</Text>
        </Text>

        <Text style={styles.subtitle}>
          Your personal AI study companion that creates
          personalized plans around your subjects, exams,
          and available time.
        </Text>

        <Text style={styles.label}>What's your name?</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
        />

        <TouchableOpacity
          style={[
            styles.button,
            !name.trim() && styles.buttonDisabled,
          ]}
          disabled={!name.trim()}
          onPress={() =>
          router.push({
          pathname: '/profile',
          params: {
          name,
           },
         })
        }
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Personalized learning • AI assistance • Progress tracking
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },

  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 20,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.8,
  },

  title: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 18,
  },

  highlight: {
    color: '#4F46E5',
  },

  subtitle: {
    fontSize: 17,
    lineHeight: 27,
    color: '#64748B',
    maxWidth: 600,
    marginBottom: 38,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },

  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#111827',
    marginBottom: 14,
  },

  button: {
    height: 56,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  arrow: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '600',
  },

  footer: {
    textAlign: 'center',
    marginTop: 28,
    fontSize: 12,
    color: '#94A3B8',
  },
});