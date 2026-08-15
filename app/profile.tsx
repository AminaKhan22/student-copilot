import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ProfileScreen() {
  const { name } = useLocalSearchParams<{
    name?: string;
  }>();

  const [subjects, setSubjects] = useState('');
  const [examDate, setExamDate] = useState('');
  const [hours, setHours] = useState('');

  const canContinue =
    subjects.trim() &&
    examDate.trim() &&
    hours.trim();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Step indicator */}
        <Text style={styles.step}>STEP 2 OF 3</Text>

        {/* Heading */}
        <Text style={styles.title}>
          Let&apos;s build your
          <Text style={styles.highlight}> study profile.</Text>
        </Text>

        <Text style={styles.subtitle}>
          Tell Student Copilot a little about your studies.
          We&apos;ll use this information to create your
          personalized study plan.
        </Text>

        {/* Subjects */}
        <View style={styles.section}>
          <Text style={styles.label}>
            What are you studying?
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. DSP, Electronics, Control Systems"
            placeholderTextColor="#94A3B8"
            value={subjects}
            onChangeText={setSubjects}
            multiline
          />

          <Text style={styles.helper}>
            Separate multiple subjects with commas.
          </Text>
        </View>

        {/* Exam date */}
        <View style={styles.section}>
          <Text style={styles.label}>
            When is your exam?
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. September 10, 2026"
            placeholderTextColor="#94A3B8"
            value={examDate}
            onChangeText={setExamDate}
          />
        </View>

        {/* Study hours */}
        <View style={styles.section}>
          <Text style={styles.label}>
            How many hours can you study per day?
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. 3"
            placeholderTextColor="#94A3B8"
            value={hours}
            onChangeText={setHours}
            keyboardType="numeric"
          />
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={[
            styles.button,
            !canContinue && styles.buttonDisabled,
          ]}
          disabled={!canContinue}
          onPress={() => {
            router.push({
              pathname: '/plan',
              params: {
                name: name || '',
                subjects,
                examDate,
                hours,
              },
            });
          }}
        >
          <Text style={styles.buttonText}>
            Continue
          </Text>

          <Text style={styles.arrow}>
            →
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Your information will be used to personalize your study plan.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 38,
  },

  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },

  step: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#4F46E5',
    marginBottom: 14,
  },

  title: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 18,
  },

  highlight: {
    color: '#4F46E5',
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 25,
    color: '#64748B',
    marginBottom: 38,
  },

  section: {
    marginBottom: 26,
  },

  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },

  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
  },

  helper: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },

  button: {
    height: 56,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
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
    marginTop: 24,
    fontSize: 12,
    color: '#94A3B8',
  },
});