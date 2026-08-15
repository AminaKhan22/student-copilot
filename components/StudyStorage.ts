import AsyncStorage from '@react-native-async-storage/async-storage';

export type StudyProgress = {
  completedTasks: string[];
  focusedMinutes: number;
  streak: number;
};

const DEFAULT_PROGRESS: StudyProgress = {
  completedTasks: [],
  focusedMinutes: 0,
  streak: 0,
};

/*
 * Create a unique storage key for each study profile.
 *
 * Subjects are the important part here. We also include
 * exam date and daily hours so a genuinely different
 * study plan gets its own progress.
 */
export function createProgressKey(
  subjects: string,
  examDate: string,
  hours: string
) {
  const profile = `${subjects
    .trim()
    .toLowerCase()}|${examDate
    .trim()
    .toLowerCase()}|${hours.trim()}`;

  return `student_copilot_progress_${encodeURIComponent(
    profile
  )}`;
}

/*
 * Load progress for this particular study profile.
 */
export async function getStudyProgress(
  subjects: string,
  examDate: string,
  hours: string
): Promise<StudyProgress> {
  try {
    const key = createProgressKey(
      subjects,
      examDate,
      hours
    );

    const saved = await AsyncStorage.getItem(key);

    if (!saved) {
      return DEFAULT_PROGRESS;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.log(
      'Could not load study progress:',
      error
    );

    return DEFAULT_PROGRESS;
  }
}

/*
 * Save progress for this particular study profile.
 */
export async function saveStudyProgress(
  progress: StudyProgress,
  subjects: string,
  examDate: string,
  hours: string
): Promise<void> {
  try {
    const key = createProgressKey(
      subjects,
      examDate,
      hours
    );

    await AsyncStorage.setItem(
      key,
      JSON.stringify(progress)
    );
  } catch (error) {
    console.log(
      'Could not save study progress:',
      error
    );
  }
}

/*
 * Mark a task as completed and add its study time.
 */
export async function completeTask(
  taskId: string,
  minutes: number,
  subjects: string,
  examDate: string,
  hours: string
): Promise<StudyProgress> {
  const current = await getStudyProgress(
    subjects,
    examDate,
    hours
  );

  const alreadyCompleted =
    current.completedTasks.includes(taskId);

  const updated: StudyProgress = {
    ...current,

    completedTasks: alreadyCompleted
      ? current.completedTasks
      : [
          ...current.completedTasks,
          taskId,
        ],

    focusedMinutes: alreadyCompleted
      ? current.focusedMinutes
      : current.focusedMinutes + minutes,
  };

  await saveStudyProgress(
    updated,
    subjects,
    examDate,
    hours
  );

  return updated;
}