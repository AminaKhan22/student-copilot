import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import FocusTimer from '../components/FocusTimer';

type StudySession = {
  id: string;
  subject: string;
  duration: number;
  task: string;
};

type StudyDay = {
  day: number;
  sessions: StudySession[];
};

export default function PlanScreen() {
  const params = useLocalSearchParams<{
    name?: string;
    subjects?: string;
    examDate?: string;
    hours?: string;
  }>();

  const name = params.name ?? '';
  const subjects = params.subjects ?? '';
  const examDate = params.examDate ?? '';
  const hours = params.hours ?? '';

  const [plan, setPlan] = useState<StudyDay[]>([]);
  const [generated, setGenerated] = useState(false);

  const [activeSession, setActiveSession] =
    useState<StudySession | null>(null);

  const generatePlan = () => {
    const subjectList = subjects
      .split(',')
      .map((subject) => subject.trim())
      .filter((subject) => subject.length > 0);

    const dailyHours = Number(hours) || 2;
    const dailyMinutes = dailyHours * 60;

    if (subjectList.length === 0) {
      return;
    }

    const tasks = [
      'Review key concepts',
      'Practice important questions',
      'Study lecture notes',
      'Solve past-paper problems',
      'Review weak areas',
      'Active recall session',
      'Revision and self-test',
    ];

    const generatedPlan: StudyDay[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      let remainingMinutes = dailyMinutes;

      let subjectIndex =
        dayIndex % subjectList.length;

      let taskIndex =
        dayIndex % tasks.length;

      const sessions: StudySession[] = [];

      while (remainingMinutes > 0) {
        let sessionMinutes = 45;

        if (remainingMinutes < 45) {
          sessionMinutes = remainingMinutes;
        }

        sessions.push({
          id: `${dayIndex + 1}-${sessions.length + 1}`,
          subject: subjectList[subjectIndex],
          duration: sessionMinutes,
          task: tasks[taskIndex],
        });

        remainingMinutes -= sessionMinutes;

        subjectIndex =
          (subjectIndex + 1) % subjectList.length;

        taskIndex =
          (taskIndex + 1) % tasks.length;
      }

      generatedPlan.push({
        day: dayIndex + 1,
        sessions,
      });
    }

    setPlan(generatedPlan);
    setGenerated(true);
    setActiveSession(null);
  };

  const totalSessions = plan.reduce(
    (total, day) =>
      total + (day.sessions?.length ?? 0),
    0
  );

  const totalMinutes = plan.reduce(
    (total, day) => {
      const sessions = day.sessions ?? [];

      return (
        total +
        sessions.reduce(
          (dayTotal, session) =>
            dayTotal + session.duration,
          0
        )
      );
    },
    0
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* BACK BUTTON */}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ← Back
          </Text>
        </TouchableOpacity>

        {/* HEADER */}

        <Text style={styles.step}>
          YOUR STUDY PLAN
        </Text>

        <Text style={styles.title}>
          Your plan is
          <Text style={styles.highlight}>
            {' '}ready.
          </Text>
        </Text>

        <Text style={styles.subtitle}>
          {name ? `${name}, ` : ''}
          Student Copilot has your study information.
          Generate a personalized 7-day schedule
          based on your subjects and available study
          time.
        </Text>

        {/* INFORMATION CARD */}

        <View style={styles.infoCard}>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              SUBJECTS
            </Text>

            <Text style={styles.infoValue}>
              {subjects || 'Not provided'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              EXAM DATE
            </Text>

            <Text style={styles.infoValue}>
              {examDate || 'Not provided'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              DAILY STUDY TIME
            </Text>

            <Text style={styles.infoValue}>
              {hours
                ? `${hours} hours`
                : 'Not provided'}
            </Text>
          </View>

        </View>

        {/* GENERATE BUTTON */}

        {!generated && (
          <TouchableOpacity
            style={styles.button}
            onPress={generatePlan}
          >
            <Text style={styles.buttonText}>
              ✦ Generate My Study Plan
            </Text>

            <Text style={styles.arrow}>
              →
            </Text>
          </TouchableOpacity>
        )}

        {/* GENERATED PLAN */}

        {generated && (
          <View style={styles.generatedSection}>

            {/* SUCCESS BOX */}

            <View style={styles.successBox}>

              <View style={styles.successIconContainer}>
                <Text style={styles.successIcon}>
                  ✓
                </Text>
              </View>

              <View style={styles.successContent}>
                <Text style={styles.successTitle}>
                  Your 7-day plan is ready
                </Text>

                <Text style={styles.successText}>
                  {totalSessions} study sessions
                  {' • '}
                  {Math.round(totalMinutes / 60)}
                  {' '}total hours
                </Text>
              </View>

            </View>

            {/* ACTIVE FOCUS TIMER */}

            {activeSession && (
              <FocusTimer
                durationMinutes={activeSession.duration}
                subject={activeSession.subject}
                task={activeSession.task}
                onComplete={() => {
                  setActiveSession(null);
                }}
              />
            )}

            {/* INSTRUCTION */}

            {!activeSession && (
              <View style={styles.instructionBox}>
                <Text style={styles.instructionIcon}>
                  ⏱
                </Text>

                <View style={styles.instructionContent}>
                  <Text style={styles.instructionTitle}>
                    Ready to focus?
                  </Text>

                  <Text style={styles.instructionText}>
                    Tap any study session below to start
                    your focus timer.
                  </Text>
                </View>
              </View>
            )}

            {/* DAYS */}

            {plan.map((day) => {

              const sessions = day.sessions ?? [];

              const dayMinutes =
                sessions.reduce(
                  (total, session) =>
                    total + session.duration,
                  0
                );

              return (
                <View
                  key={day.day}
                  style={styles.daySection}
                >

                  {/* DAY HEADER */}

                  <View style={styles.dayHeader}>

                    <View>
                      <Text style={styles.dayLabel}>
                        DAY {day.day}
                      </Text>

                      <Text style={styles.dayTitle}>
                        Study sessions
                      </Text>
                    </View>

                    <View style={styles.dayHoursBadge}>
                      <Text style={styles.dayHoursText}>
                        {(dayMinutes / 60).toFixed(1)}h
                      </Text>
                    </View>

                  </View>

                  {/* SESSIONS */}

                  {sessions.map((session) => {

                    const isActive =
                      activeSession?.id === session.id;

                    return (
                      <TouchableOpacity
                        key={session.id}
                        style={[
                          styles.sessionCard,
                          isActive &&
                            styles.activeSessionCard,
                        ]}
                        activeOpacity={0.8}
                        onPress={() =>
                          setActiveSession(session)
                        }
                      >

                        <View
                          style={[
                            styles.sessionNumber,
                            isActive &&
                              styles.activeSessionNumber,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sessionNumberText,
                              isActive &&
                                styles.activeSessionNumberText,
                            ]}
                          >
                            {session.id.split('-')[1]}
                          </Text>
                        </View>

                        <View style={styles.sessionContent}>

                          <Text style={styles.subject}>
                            {session.subject}
                          </Text>

                          <Text style={styles.task}>
                            {session.task}
                          </Text>

                          {isActive && (
                            <Text style={styles.focusLabel}>
                              ● FOCUSING NOW
                            </Text>
                          )}

                        </View>

                        <View style={styles.durationBadge}>
                          <Text style={styles.durationText}>
                            {session.duration}m
                          </Text>
                        </View>

                      </TouchableOpacity>
                    );
                  })}

                </View>
              );
            })}

            {/* DASHBOARD BUTTON */}

            <TouchableOpacity
              style={styles.dashboardButton}
              onPress={() => {
                router.push({
                  pathname: '/dashboard',
                  params: {
                    name,
                    subjects,
                    hours,
                  },
                });
              }}
            >
              <Text style={styles.dashboardText}>
                Go to Dashboard
              </Text>

              <Text style={styles.dashboardArrow}>
                →
              </Text>
            </TouchableOpacity>

          </View>
        )}

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
    paddingBottom: 60,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 32,
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
    marginBottom: 16,
  },

  highlight: {
    color: '#4F46E5',
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 25,
    color: '#64748B',
    marginBottom: 28,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 22,
  },

  infoRow: {
    paddingVertical: 4,
  },

  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#94A3B8',
    marginBottom: 6,
  },

  infoValue: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: '#1E293B',
  },

  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },

  button: {
    height: 58,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  arrow: {
    color: '#FFFFFF',
    fontSize: 21,
  },

  generatedSection: {
    marginTop: 4,
  },

  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },

  successIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  successIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4F46E5',
  },

  successContent: {
    flex: 1,
  },

  successTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#312E81',
    marginBottom: 5,
  },

  successText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6366F1',
  },

  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },

  instructionIcon: {
    fontSize: 24,
    marginRight: 14,
  },

  instructionContent: {
    flex: 1,
  },

  instructionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 3,
  },

  instructionText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },

  daySection: {
    marginBottom: 24,
  },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  dayLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#4F46E5',
    marginBottom: 3,
  },

  dayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  dayHoursBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },

  dayHoursText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },

  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 9,
  },

  activeSessionCard: {
    borderColor: '#4F46E5',
    backgroundColor: '#F8F7FF',
  },

  sessionNumber: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  activeSessionNumber: {
    backgroundColor: '#4F46E5',
  },

  sessionNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },

  activeSessionNumberText: {
    color: '#FFFFFF',
  },

  sessionContent: {
    flex: 1,
  },

  subject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 4,
  },

  task: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },

  focusLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#4F46E5',
    marginTop: 6,
  },

  durationBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    marginLeft: 8,
  },

  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },

  dashboardButton: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },

  dashboardText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '700',
  },

  dashboardArrow: {
    color: '#4F46E5',
    fontSize: 20,
  },
});