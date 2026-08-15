import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type StudyCoachProps = {
  studentName?: string;
  subjects?: string;
  currentTask?: string;
  remainingTasks?: number;
  focusedMinutes?: number;
  dailyHours?: number;
};

type Message = {
  id: string;
  sender: 'user' | 'coach';
  text: string;
};

const API_URL =
  'https://student-copilot-iota.vercel.app/api/coach';

/* =========================================================
   FORMULA FORMATTER
   ========================================================= */

function formatFormula(input: string): string {
  let text = input;

  text = text
    .replace(/\\\[/g, '')
    .replace(/\\\]/g, '')
    .replace(/\\\(/g, '')
    .replace(/\\\)/g, '')
    .replace(/\$\$/g, '')
    .replace(/\$/g, '');

  text = text.replace(
    /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
    '($1)/($2)'
  );

  text = text.replace(
    /\\sqrt\s*\{([^{}]+)\}/g,
    '√($1)'
  );

  const greek: Record<string, string> = {
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\epsilon': 'ε',
    '\\theta': 'θ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\pi': 'π',
    '\\sigma': 'σ',
    '\\omega': 'ω',
    '\\phi': 'φ',
    '\\rho': 'ρ',
    '\\tau': 'τ',
    '\\Delta': 'Δ',
    '\\Omega': 'Ω',
    '\\Sigma': 'Σ',
    '\\Theta': 'Θ',
    '\\Lambda': 'Λ',
    '\\Phi': 'Φ',
  };

  Object.entries(greek).forEach(([latex, symbol]) => {
    text = text.replaceAll(latex, symbol);
  });

  const symbols: Record<string, string> = {
    '\\times': '×',
    '\\cdot': '·',
    '\\div': '÷',
    '\\pm': '±',
    '\\leq': '≤',
    '\\geq': '≥',
    '\\neq': '≠',
    '\\approx': '≈',
    '\\rightarrow': '→',
    '\\to': '→',
    '\\infty': '∞',
    '\\sum': 'Σ',
    '\\int': '∫',
    '\\partial': '∂',
    '\\propto': '∝',
  };

  Object.entries(symbols).forEach(([latex, symbol]) => {
    text = text.replaceAll(latex, symbol);
  });

  const superscripts: Record<string, string> = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '+': '⁺',
    '-': '⁻',
    n: 'ⁿ',
  };

  text = text.replace(
    /\^([0-9n+\-])/g,
    (_, value: string) =>
      superscripts[value] || `^${value}`
  );

  text = text.replace(
    /\^\{([^{}]+)\}/g,
    (_, value: string) =>
      value
        .split('')
        .map(
          (char: string) =>
            superscripts[char] || char
        )
        .join('')
  );

  const subscripts: Record<string, string> = {
    '0': '₀',
    '1': '₁',
    '2': '₂',
    '3': '₃',
    '4': '₄',
    '5': '₅',
    '6': '₆',
    '7': '₇',
    '8': '₈',
    '9': '₉',
    n: 'ₙ',
  };

  text = text.replace(
    /_([0-9n])/g,
    (_, value: string) =>
      subscripts[value] || `_${value}`
  );

  text = text.replace(
    /_\{([^{}]+)\}/g,
    (_, value: string) =>
      value
        .split('')
        .map(
          (char: string) =>
            subscripts[char] || char
        )
        .join('')
  );

  text = text
    .replace(
      /\\text\{([^{}]*)\}/g,
      '$1'
    )
    .replace(
      /\\mathrm\{([^{}]*)\}/g,
      '$1'
    )
    .replace(
      /\\mathbf\{([^{}]*)\}/g,
      '$1'
    )
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\,/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/\\!/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .replace(/\\/g, '');

  return text.trim();
}

/* =========================================================
   FORMATTED MESSAGE
   ========================================================= */

function FormattedMessage({
  text,
  isUser,
}: {
  text: string;
  isUser: boolean;
}) {
  if (isUser) {
    return (
      <Text style={styles.userMessageText}>
        {text}
      </Text>
    );
  }

  const lines = text.split('\n');

  return (
    <View>
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line) {
          return (
            <View
              key={`space-${index}`}
              style={styles.smallSpace}
            />
          );
        }

        if (line.startsWith('### ')) {
          return (
            <Text
              key={index}
              style={styles.heading3}
            >
              {formatFormula(
                line.replace(/^###\s*/, '')
              )}
            </Text>
          );
        }

        if (line.startsWith('## ')) {
          return (
            <Text
              key={index}
              style={styles.heading2}
            >
              {formatFormula(
                line.replace(/^##\s*/, '')
              )}
            </Text>
          );
        }

        if (line.startsWith('# ')) {
          return (
            <Text
              key={index}
              style={styles.heading1}
            >
              {formatFormula(
                line.replace(/^#\s*/, '')
              )}
            </Text>
          );
        }

        if (
          line.startsWith('- ') ||
          line.startsWith('* ') ||
          line.startsWith('• ')
        ) {
          const bullet = line
            .replace(/^[-*•]\s*/, '')
            .trim();

          return (
            <View
              key={index}
              style={styles.bulletRow}
            >
              <Text style={styles.bullet}>
                •
              </Text>

              <Text
                style={styles.coachMessageText}
              >
                {formatFormula(bullet)}
              </Text>
            </View>
          );
        }

        const numberedMatch =
          line.match(/^(\d+)[.)]\s+(.*)$/);

        if (numberedMatch) {
          return (
            <View
              key={index}
              style={styles.numberRow}
            >
              <View
                style={styles.numberCircle}
              >
                <Text
                  style={styles.numberText}
                >
                  {numberedMatch[1]}
                </Text>
              </View>

              <Text
                style={styles.coachMessageText}
              >
                {formatFormula(
                  numberedMatch[2]
                )}
              </Text>
            </View>
          );
        }

        const cleaned =
          formatFormula(line);

        const looksLikeFormula =
          /[=+\-×÷]/.test(cleaned) &&
          (
            /[A-Za-z]\s*=/.test(cleaned) ||
            /\d+\s*[×÷]\s*\d+/.test(cleaned) ||
            /√/.test(cleaned)
          );

        if (looksLikeFormula) {
          return (
            <View
              key={index}
              style={styles.formulaBox}
            >
              <Text
                style={styles.formulaText}
              >
                {cleaned}
              </Text>
            </View>
          );
        }

        return (
          <Text
            key={index}
            style={styles.coachMessageText}
          >
            {formatFormula(line)}
          </Text>
        );
      })}
    </View>
  );
}

/* =========================================================
   STUDY COACH
   ========================================================= */

export default function StudyCoach({
  studentName = 'Student',
  subjects = '',
  currentTask = '',
  remainingTasks = 0,
  focusedMinutes = 0,
  dailyHours = 3,
}: StudyCoachProps) {
  const [question, setQuestion] =
    useState('');

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [loading, setLoading] =
    useState(false);

  /* =======================================================
     SEND QUESTION
     ======================================================= */

  const sendQuestion = async () => {
    const trimmedQuestion =
      question.trim();

    if (!trimmedQuestion || loading) {
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      sender: 'user',
      text: trimmedQuestion,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setQuestion('');
    setLoading(true);

    try {
      console.log(
        '================================'
      );

      console.log(
        'STUDY COACH REQUEST'
      );

      console.log(
        'API:',
        API_URL
      );

      console.log(
        'QUESTION:',
        trimmedQuestion
      );

      console.log(
        '================================'
      );

      const controller =
        new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 60000);

      let response: Response;

      try {
        response = await fetch(
          API_URL,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
              Accept:
                'application/json',
            },

            body: JSON.stringify({
              question:
                trimmedQuestion,

              studentName,

              subjects,

              currentTask,

              remainingTasks,

              focusedMinutes,

              dailyHours,
            }),

            signal:
              controller.signal,
          }
        );
      } finally {
        clearTimeout(timeout);
      }

      console.log(
        'HTTP STATUS:',
        response.status
      );

      const responseText =
        await response.text();

      console.log(
        'RAW SERVER RESPONSE:',
        responseText
      );

      let data: any = null;

      try {
        data =
          JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server returned invalid JSON. HTTP ${response.status}. Response: ${responseText.substring(
            0,
            500
          )}`
        );
      }

      console.log(
        'PARSED SERVER DATA:',
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Server error: HTTP ${response.status}`
        );
      }

      if (
        !data ||
        typeof data.answer !== 'string' ||
        !data.answer.trim()
      ) {
        throw new Error(
          'Server responded successfully, but no AI answer was returned.'
        );
      }

      const coachMessage: Message = {
        id: `${Date.now()}-coach`,
        sender: 'coach',
        text: data.answer.trim(),
      };

      setMessages((current) => [
        ...current,
        coachMessage,
      ]);
    } catch (error) {
      console.error(
        '================================'
      );

      console.error(
        'STUDY COACH ERROR'
      );

      console.error(error);

      console.error(
        '================================'
      );

      let errorText =
        '⚠️ Study Coach error.\n\n';

      if (error instanceof Error) {
        if (
          error.name ===
          'AbortError'
        ) {
          errorText +=
            'The request timed out after 60 seconds.';
        } else {
          errorText +=
            error.message;
        }
      } else {
        errorText +=
          String(error);
      }

      errorText +=
        '\n\nPlease check the API/Vercel configuration.';

      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        sender: 'coach',
        text: errorText,
      };

      setMessages((current) => [
        ...current,
        errorMessage,
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     UI
     ======================================================= */

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>
            STUDY COACH
          </Text>

          <Text style={styles.title}>
            Need some help?
          </Text>
        </View>

        <View style={styles.icon}>
          <Text style={styles.iconText}>
            ✦
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Ask me anything about your
        course material, formulas,
        numerical problems, or exams.
      </Text>

      {messages.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>
            💡
          </Text>

          <Text style={styles.emptyTitle}>
            Your Study Coach is ready
          </Text>

          <Text style={styles.emptyText}>
            Ask about course material,
            formulas, numerical problems,
            exam preparation, or anything
            you are studying.
          </Text>
        </View>
      ) : (
        <View style={styles.messages}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.message,
                message.sender === 'user'
                  ? styles.userMessage
                  : styles.coachMessage,
              ]}
            >
              <FormattedMessage
                text={message.text}
                isUser={
                  message.sender === 'user'
                }
              />
            </View>
          ))}

          {loading && (
            <View
              style={[
                styles.message,
                styles.coachMessage,
                styles.loadingMessage,
              ]}
            >
              <ActivityIndicator
                size="small"
                color="#4F46E5"
              />

              <Text
                style={styles.loadingText}
              >
                Study Coach is thinking...
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask your Study Coach..."
          placeholderTextColor="#94A3B8"
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={sendQuestion}
          returnKeyType="send"
          editable={!loading}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!question.trim() ||
              loading) &&
              styles.sendButtonDisabled,
          ]}
          onPress={sendQuestion}
          disabled={
            !question.trim() ||
            loading
          }
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.sendText}>
              →
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#4F46E5',
    marginBottom: 6,
  },

  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 18,
  },

  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconText: {
    fontSize: 22,
    color: '#4F46E5',
  },

  emptyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyIcon: {
    fontSize: 25,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: '#64748B',
  },

  messages: {
    marginBottom: 16,
  },

  message: {
    maxWidth: '92%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 10,
  },

  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4F46E5',
  },

  coachMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
  },

  userMessageText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
  },

  coachMessageText: {
    color: '#312E81',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },

  heading1: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 10,
  },

  heading2: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
    color: '#312E81',
    marginBottom: 8,
  },

  heading3: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    color: '#4338CA',
    marginBottom: 6,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },

  bullet: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4F46E5',
    width: 18,
  },

  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  numberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  numberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  formulaBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 5,
  },

  formulaText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#1E1B4B',
    textAlign: 'center',
  },

  smallSpace: {
    height: 5,
  },

  loadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 13,
    color: '#4F46E5',
    marginLeft: 8,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 13,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  sendButtonDisabled: {
    opacity: 0.4,
  },

  sendText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
});