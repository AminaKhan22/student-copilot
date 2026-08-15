import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getStudyProgress,
  completeTask as saveCompletedTask,
  StudyProgress,
} from '../components/StudyStorage';

import StudyCoach from '../components/StudyCoach';

type TaskStatus = 'pending' | 'active' | 'completed';

type Task = {
  id: string;
  subject: string;
  title: string;
  duration: number;
  status: TaskStatus;
};

export default function DashboardScreen() {
  const router = useRouter();

  const { name, subjects, examDate, hours } =
    useLocalSearchParams<{
      name?: string;
      subjects?: string;
      examDate?: string;
      hours?: string;
    }>();

  const studentName = name || 'Student';
  const dailyHours = Number(hours) || 3;

  const subjectList = (subjects || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  /*
   * CREATE TODAY'S TASKS
   */
  const createTasks = (): Task[] => {
    const taskTitles = [
      'Review key concepts',
      'Practice important questions',
      'Active recall session',
    ];

    return subjectList.slice(0, 3).map((subject, index) => ({
      id: `${subject.toLowerCase()}-${index}`,
      subject,
      title: taskTitles[index],
      duration: Math.max(
        30,
        Math.round((dailyHours * 60) / 3)
      ),
      status: 'pending',
    }));
  };

  const [tasks, setTasks] = useState<Task[]>(createTasks);

  const [activeTaskId, setActiveTaskId] =
    useState<string | null>(null);

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const [timerRunning, setTimerRunning] =
    useState(false);

  const [savedProgress, setSavedProgress] =
    useState<StudyProgress>({
      completedTasks: [],
      focusedMinutes: 0,
      streak: 0,
    });

  const [loadingProgress, setLoadingProgress] =
    useState(true);

  /*
   * LOAD PROFILE-SPECIFIC PROGRESS
   */
  useEffect(() => {
    const loadProgress = async () => {
      setLoadingProgress(true);

      const progress = await getStudyProgress(
        subjects || '',
        examDate || '',
        hours || ''
      );

      setSavedProgress(progress);

      const newTasks = createTasks();

      const updatedTasks = newTasks.map((task) =>
        progress.completedTasks.includes(task.id)
          ? {
              ...task,
              status: 'completed' as TaskStatus,
            }
          : task
      );

      setTasks(updatedTasks);

      setActiveTaskId(null);
      setRemainingSeconds(0);
      setTimerRunning(false);

      setLoadingProgress(false);
    };

    loadProgress();
  }, [subjects, examDate, hours]);

  /*
   * TIMER
   */
  useEffect(() => {
    if (!timerRunning) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          clearInterval(interval);
          setTimerRunning(false);

          if (activeTaskId) {
            finishTask(activeTaskId);
          }

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, activeTaskId]);

  /*
   * FORMAT TIMER
   */
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(
      2,
      '0'
    )}:${String(secs).padStart(2, '0')}`;
  };

  /*
   * START TASK
   */
  const startTask = (task: Task) => {
    if (
      activeTaskId &&
      activeTaskId !== task.id
    ) {
      return;
    }

    setActiveTaskId(task.id);
    setRemainingSeconds(task.duration * 60);
    setTimerRunning(true);

    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: 'active',
            }
          : item
      )
    );
  };

  /*
   * FINISH TASK + SAVE PROGRESS
   */
  const finishTask = async (taskId: string) => {
    const task = tasks.find(
      (item) => item.id === taskId
    );

    if (!task) {
      return;
    }

    setTimerRunning(false);
    setActiveTaskId(null);
    setRemainingSeconds(0);

    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === taskId
          ? {
              ...item,
              status: 'completed',
            }
          : item
      )
    );

    try {
      const updatedProgress =
        await saveCompletedTask(
          taskId,
          task.duration,
          subjects || '',
          examDate || '',
          hours || ''
        );

      setSavedProgress(updatedProgress);
    } catch (error) {
      console.log(
        'Could not save study progress:',
        error
      );
    }
  };

  /*
   * PAUSE / RESUME
   */
  const toggleTimer = () => {
    setTimerRunning((current) => !current);
  };

  /*
   * RESET TIMER
   */
  const resetTimer = (task: Task) => {
    setRemainingSeconds(task.duration * 60);
    setTimerRunning(false);
  };

  /*
   * PROGRESS
   */
  const completedMinutes =
    savedProgress.focusedMinutes || 0;

  const completedHours =
    completedMinutes / 60;

  const progress =
    dailyHours > 0
      ? Math.min(
          completedHours / dailyHours,
          1
        )
      : 0;

  const progressPercent =
    Math.round(progress * 100);

  /*
   * LOADING
   */
  if (loadingProgress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>
            Loading your study progress...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Good to see you,
            </Text>

            <Text style={styles.name}>
              {studentName} 👋
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {studentName
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Here&apos;s what your study day looks like.
        </Text>

        {/* AI STUDY COACH */}

        <StudyCoach
          studentName={studentName}
          subjects={subjects || ''}
          currentTask={
            tasks.find(
              (task) => task.status === 'pending'
            )
              ? `${tasks.find(
                  (task) =>
                    task.status === 'pending'
                )?.subject} — ${tasks.find(
                  (task) =>
                    task.status === 'pending'
                )?.title}`
              : ''
          }
          remainingTasks={
            tasks.filter(
              (task) =>
                task.status !== 'completed'
            ).length
          }
          focusedMinutes={
            savedProgress.focusedMinutes
          }
          dailyHours={dailyHours}
        />

        {/* PROGRESS CARD */}

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressLabel}>
                TODAY&apos;S PROGRESS
              </Text>

              <Text style={styles.progressValue}>
                {completedHours.toFixed(1)} /{' '}
                {dailyHours} hours
              </Text>
            </View>

            <Text style={styles.progressPercent}>
              {progressPercent}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progressPercent}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.progressMessage}>
            {progressPercent === 100
              ? 'Excellent! You completed your study goal today. 🎉'
              : 'Complete your focus sessions to increase your progress.'}
          </Text>
        </View>

        {/* COURSE MATERIAL */}

        <Pressable
          style={styles.courseMaterialButton}
          onPress={() =>
            router.push('/course-material')
          }
        >
          <Text style={styles.courseMaterialIcon}>
            📚
          </Text>

          <View
            style={styles.courseMaterialTextContainer}
          >
            <Text style={styles.courseMaterialTitle}>
              Course Material
            </Text>

            <Text
              style={styles.courseMaterialSubtitle}
            >
              Upload PDFs and study from your course
              material
            </Text>
          </View>

          <Text style={styles.courseMaterialArrow}>
            ›
          </Text>
        </Pressable>

        {/* TODAY */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            TODAY
          </Text>

          <Text style={styles.taskCount}>
            {tasks.length} tasks
          </Text>
        </View>

        {/* TASKS */}

        {tasks.length > 0 ? (
          tasks.map((task) => {
            const isActive =
              activeTaskId === task.id;

            return (
              <View
                key={task.id}
                style={[
                  styles.taskCard,
                  isActive &&
                    styles.activeTaskCard,
                ]}
              >
                <View style={styles.taskTop}>
                  {/* ICON */}

                  <View style={styles.taskIcon}>
                    <Text
                      style={styles.taskIconText}
                    >
                      📚
                    </Text>
                  </View>

                  {/* CONTENT */}

                  <View style={styles.taskContent}>
                    <Text
                      style={styles.taskSubject}
                    >
                      {task.subject}
                    </Text>

                    <Text
                      style={styles.taskTitle}
                    >
                      {task.title}
                    </Text>

                    <Text
                      style={styles.taskDuration}
                    >
                      {task.duration} minutes
                    </Text>
                  </View>

                  {/* START */}

                  {task.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={() =>
                        startTask(task)
                      }
                      disabled={
                        activeTaskId !== null
                      }
                    >
                      <Text
                        style={styles.startText}
                      >
                        Start
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* ACTIVE */}

                  {task.status === 'active' && (
                    <TouchableOpacity
                      style={
                        styles.completeButton
                      }
                      onPress={() =>
                        finishTask(task.id)
                      }
                    >
                      <Text
                        style={
                          styles.completeText
                        }
                      >
                        Complete
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* COMPLETED */}

                  {task.status === 'completed' && (
                    <View
                      style={
                        styles.completedButton
                      }
                    >
                      <Text
                        style={
                          styles.completedText
                        }
                      >
                        ✓ Done
                      </Text>
                    </View>
                  )}
                </View>

                {/* FOCUS TIMER */}

                {isActive && (
                  <View style={styles.timerBox}>
                    <Text style={styles.timerLabel}>
                      FOCUS SESSION
                    </Text>

                    <Text
                      style={styles.timerSubject}
                    >
                      {task.subject}
                    </Text>

                    <Text
                      style={styles.timerTitle}
                    >
                      {task.title}
                    </Text>

                    <Text style={styles.timer}>
                      {formatTime(
                        remainingSeconds
                      )}
                    </Text>

                    <Text style={styles.timerHint}>
                      Stay focused. You&apos;ve got
                      this. 💪
                    </Text>

                    <View
                      style={styles.timerButtons}
                    >
                      {/* PAUSE / RESUME */}

                      <TouchableOpacity
                        style={
                          styles.pauseButton
                        }
                        onPress={toggleTimer}
                      >
                        <Text
                          style={
                            styles.pauseText
                          }
                        >
                          {timerRunning
                            ? '⏸ Pause'
                            : '▶ Resume'}
                        </Text>
                      </TouchableOpacity>

                      {/* RESET */}

                      <TouchableOpacity
                        style={
                          styles.resetButton
                        }
                        onPress={() =>
                          resetTimer(task)
                        }
                      >
                        <Text
                          style={
                            styles.resetText
                          }
                        >
                          ↻ Reset
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No subjects yet
            </Text>

            <Text style={styles.emptyText}>
              Complete your study profile to create
              personalized tasks.
            </Text>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 50,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  greeting: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 4,
  },

  name: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },

  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 20,
  },

  progressCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    marginTop: 20,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#C7D2FE',
    marginBottom: 8,
  },

  progressValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  progressPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  progressTrack: {
    height: 8,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    marginTop: 20,
    overflow: 'hidden',
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },

  progressMessage: {
    fontSize: 13,
    color: '#E0E7FF',
    marginTop: 14,
  },

  /* COURSE MATERIAL */

  courseMaterialButton: {
    marginBottom: 26,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },

  courseMaterialIcon: {
    fontSize: 32,
    marginRight: 14,
  },

  courseMaterialTextContainer: {
    flex: 1,
  },

  courseMaterialTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#172033',
  },

  courseMaterialSubtitle: {
    fontSize: 13,
    color: '#667085',
    marginTop: 4,
  },

  courseMaterialArrow: {
    fontSize: 30,
    color: '#2563EB',
  },

  /* TODAY */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#64748B',
  },

  taskCount: {
    fontSize: 14,
    color: '#94A3B8',
  },

  /* TASK CARD */

  taskCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },

  activeTaskCard: {
    borderColor: '#4F46E5',
  },

  taskTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  taskIcon: {
    width: 66,
    height: 66,
    borderRadius: 17,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },

  taskIconText: {
    fontSize: 28,
  },

  taskContent: {
    flex: 1,
  },

  taskSubject: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4F46E5',
    marginBottom: 5,
  },

  taskTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 5,
  },

  taskDuration: {
    fontSize: 14,
    color: '#94A3B8',
  },

  startButton: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 13,
    marginLeft: 10,
  },

  startText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '800',
  },

  completeButton: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 13,
    marginLeft: 10,
  },

  completeText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '800',
  },

  completedButton: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 13,
    marginLeft: 10,
  },

  completedText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800',
  },

  /* TIMER */

  timerBox: {
    marginTop: 18,
    padding: 22,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
  },

  timerLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#6366F1',
    marginBottom: 8,
  },

  timerSubject: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4F46E5',
  },

  timerTitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  timer: {
    fontSize: 54,
    lineHeight: 64,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: 2,
  },

  timerHint: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
  },

  timerButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  pauseButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },

  pauseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  resetButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },

  resetText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '800',
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: '#64748B',
  },

  /* LOADING */

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: 15,
    color: '#64748B',
  },
});