import { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type FocusTimerProps = {
  durationMinutes: number;
  subject: string;
  task: string;
  onComplete?: () => void;
};

export default function FocusTimer({
  durationMinutes,
  subject,
  task,
  onComplete,
}: FocusTimerProps) {
  const initialSeconds = Math.max(
    1,
    Math.round(durationMinutes * 60)
  );

  const [secondsLeft, setSecondsLeft] =
    useState(initialSeconds);

  const [isRunning, setIsRunning] =
    useState(false);

  const [completed, setCompleted] =
    useState(false);

  useEffect(() => {
    if (!isRunning || completed) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          setCompleted(true);

          if (onComplete) {
            onComplete();
          }

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, completed, onComplete]);

  const resetTimer = () => {
    setSecondsLeft(initialSeconds);
    setIsRunning(false);
    setCompleted(false);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const formattedTime =
    `${String(minutes).padStart(2, '0')}:` +
    `${String(seconds).padStart(2, '0')}`;

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <Text style={styles.label}>
        FOCUS SESSION
      </Text>

      <Text style={styles.subject}>
        {subject}
      </Text>

      <Text style={styles.task}>
        {task}
      </Text>

      {/* TIMER */}

      <View style={styles.timerCircle}>

        {completed ? (
          <>
            <Text style={styles.completedIcon}>
              ✓
            </Text>

            <Text style={styles.completedText}>
              COMPLETE
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.timer}>
              {formattedTime}
            </Text>

            <Text style={styles.timerLabel}>
              FOCUS TIME
            </Text>
          </>
        )}

      </View>

      {/* CONTROLS */}

      {!completed ? (
        <View style={styles.controls}>

          <TouchableOpacity
            style={styles.mainButton}
            onPress={() =>
              setIsRunning((current) => !current)
            }
          >
            <Text style={styles.mainButtonText}>
              {isRunning ? 'Ⅱ  Pause' : '▶  Start'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetTimer}
          >
            <Text style={styles.resetText}>
              Reset
            </Text>
          </TouchableOpacity>

        </View>
      ) : (
        <View style={styles.completeSection}>

          <Text style={styles.completeMessage}>
            Great work! You completed this focus
            session.
          </Text>

          <TouchableOpacity
            style={styles.mainButton}
            onPress={resetTimer}
          >
            <Text style={styles.mainButtonText}>
              Start Again
            </Text>
          </TouchableOpacity>

        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    marginBottom: 24,
    alignItems: 'center',
  },

  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#4F46E5',
    marginBottom: 8,
  },

  subject: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 5,
  },

  task: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },

  timerCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#EEF2FF',
    borderWidth: 8,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  timer: {
    fontSize: 42,
    fontWeight: '800',
    color: '#312E81',
    letterSpacing: 1,
  },

  timerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#6366F1',
    marginTop: 5,
  },

  completedIcon: {
    fontSize: 48,
    fontWeight: '800',
    color: '#4F46E5',
  },

  completedText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#4F46E5',
    marginTop: 4,
  },

  controls: {
    width: '100%',
    alignItems: 'center',
  },

  mainButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  resetButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },

  completeSection: {
    width: '100%',
    alignItems: 'center',
  },

  completeMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
});