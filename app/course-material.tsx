// app/course-material.tsx

import * as DocumentPicker from "expo-document-picker";
import React, { useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const API_URL =
  "https://student-copilot-iota.vercel.app/api/coach";

export default function CourseMaterialScreen() {
  const [selectedFile, setSelectedFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(
      null
    );

  const [question, setQuestion] =
    useState("");

  const [answer, setAnswer] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // PICK PDF
  // =====================================================

  const pickPDF = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: "application/pdf",
          copyToCacheDirectory: true,
          multiple: false,
        });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0
      ) {
        const file = result.assets[0];

        setSelectedFile(file);
        setAnswer("");
        setQuestion("");

        Alert.alert(
          "PDF Selected",
          `${file.name} has been added successfully.`
        );
      }
    } catch (error) {
      console.error(
        "PDF picker error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not select the PDF. Please try again."
      );
    }
  };

  // =====================================================
  // SEND PDF TO AI
  // =====================================================

  const sendPDFToAI = async (
    userQuestion: string
  ) => {
    if (!selectedFile) {
      Alert.alert(
        "No PDF",
        "Please choose a PDF first."
      );
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      console.log(
        "Preparing PDF for AI..."
      );

      const formData = new FormData();

      // -----------------------------
      // Text fields
      // -----------------------------

      formData.append(
        "question",
        userQuestion
      );

      formData.append(
        "studentName",
        "Student"
      );

      formData.append(
        "subjects",
        "Course Material"
      );

      // -----------------------------
      // PDF FILE
      // -----------------------------

      // Expo Web provides a File object.
      const webFile =
        (selectedFile as any).file;

      if (webFile) {
        console.log(
          "Using Web File object."
        );

        formData.append(
          "pdf",
          webFile,
          selectedFile.name
        );
      } else {
        console.log(
          "Using native file URI."
        );

        formData.append(
          "pdf",
          {
            uri: selectedFile.uri,
            name:
              selectedFile.name ||
              "course-material.pdf",
            type:
              selectedFile.mimeType ||
              "application/pdf",
          } as any
        );
      }

      console.log(
        "Sending PDF to:",
        API_URL
      );

      // IMPORTANT:
      // Do NOT manually set Content-Type.
      // fetch automatically adds the multipart boundary.
      const response = await fetch(
        API_URL,
        {
          method: "POST",
          body: formData,
        }
      );

      console.log(
        "AI response status:",
        response.status
      );

      // -----------------------------
      // Read response safely
      // -----------------------------

      const responseText =
        await response.text();

      console.log(
        "AI raw response:",
        responseText.substring(
          0,
          1000
        )
      );

      let data: any = {};

      try {
        data =
          responseText
            ? JSON.parse(responseText)
            : {};
      } catch (jsonError) {
        console.error(
          "Could not parse server response:",
          jsonError
        );

        throw new Error(
          "The server returned an invalid response."
        );
      }

      // -----------------------------
      // Server error
      // -----------------------------

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `AI request failed (${response.status}).`
        );
      }

      // -----------------------------
      // AI answer
      // -----------------------------

      if (
        !data?.answer ||
        typeof data.answer !==
          "string"
      ) {
        throw new Error(
          "The AI returned an empty answer."
        );
      }

      setAnswer(
        data.answer.trim()
      );
    } catch (error) {
      console.error(
        "PDF AI error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      setAnswer(
        `AI Study Coach could not process the PDF.\n\nError: ${message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SUMMARIZE
  // =====================================================

  const summarizePDF = async () => {
    await sendPDFToAI(
      `Summarize this PDF completely for a student.

Read the entire PDF before answering.

Include:

1. OVERVIEW
2. MAIN CONCEPTS
3. IMPORTANT DEFINITIONS
4. IMPORTANT FORMULAS
5. KEY POINTS
6. IMPORTANT EXAMPLES
7. EXAM-IMPORTANT INFORMATION
8. SHORT REVISION SUMMARY

Make the summary comprehensive and useful for exam preparation.

Do not stop after giving only a short introduction.`
    );
  };

  // =====================================================
  // ASK QUESTION
  // =====================================================

  const askQuestion = async () => {
    const trimmedQuestion =
      question.trim();

    if (!trimmedQuestion) {
      Alert.alert(
        "Enter a question",
        "Please type a question about your PDF."
      );
      return;
    }

    await sendPDFToAI(
      `Answer this question using the uploaded PDF as the main source:

${trimmedQuestion}

Give a complete, clear, student-friendly answer.

Use the PDF as the primary source.

If the PDF does not contain enough information to answer the question, clearly say so instead of inventing information.`
    );
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        Course Material
      </Text>

      <Text style={styles.subtitle}>
        Upload your course material and
        study it with AI.
      </Text>

      {/* ================================================= */}
      {/* PDF UPLOAD */}
      {/* ================================================= */}

      <View style={styles.uploadCard}>
        <Text style={styles.uploadIcon}>
          📄
        </Text>

        <Text style={styles.uploadTitle}>
          Upload PDF
        </Text>

        <Text
          style={
            styles.uploadDescription
          }
        >
          Select notes, lectures,
          textbook chapters,
          assignments, or other course
          material.
        </Text>

        <Pressable
          style={styles.uploadButton}
          onPress={pickPDF}
          disabled={loading}
        >
          <Text
            style={
              styles.uploadButtonText
            }
          >
            + Choose PDF
          </Text>
        </Pressable>
      </View>

      {/* ================================================= */}
      {/* SELECTED FILE */}
      {/* ================================================= */}

      {selectedFile && (
        <View style={styles.fileCard}>
          <View
            style={
              styles.fileIconContainer
            }
          >
            <Text style={styles.fileIcon}>
              📕
            </Text>
          </View>

          <View style={styles.fileInfo}>
            <Text
              style={styles.fileName}
              numberOfLines={2}
            >
              {selectedFile.name}
            </Text>

            {selectedFile.size ? (
              <Text
                style={styles.fileSize}
              >
                {(
                  selectedFile.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </Text>
            ) : null}

            <Text
              style={styles.fileStatus}
            >
              ✓ PDF selected
            </Text>
          </View>
        </View>
      )}

      {/* ================================================= */}
      {/* AI STUDY SECTION */}
      {/* ================================================= */}

      {selectedFile && (
        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>
            🤖 Study With AI
          </Text>

          <Text
            style={
              styles.aiDescription
            }
          >
            Gemini can read your PDF and
            help you understand the
            material, summarize it, and
            answer questions about it.
          </Text>

          {/* SUMMARY */}

          <Pressable
            style={[
              styles.summaryButton,
              loading &&
                styles.disabledButton,
            ]}
            onPress={summarizePDF}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.summaryButtonText
                }
              >
                ✨ Summarize This PDF
              </Text>
            )}
          </Pressable>

          {/* QUESTION */}

          <Text
            style={
              styles.questionLabel
            }
          >
            Ask a question about this PDF
          </Text>

          <TextInput
            style={
              styles.questionInput
            }
            placeholder="Example: Explain Newton's second law from this material."
            placeholderTextColor="#98A2B3"
            value={question}
            onChangeText={setQuestion}
            multiline
            textAlignVertical="top"
            editable={!loading}
          />

          <Pressable
            style={[
              styles.askButton,
              loading &&
                styles.disabledButton,
            ]}
            onPress={askQuestion}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.askButtonText
                }
              >
                Ask AI
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {/* ================================================= */}
      {/* AI ANSWER */}
      {/* ================================================= */}

      {answer ? (
        <View
          style={styles.answerCard}
        >
          <Text
            style={
              styles.answerTitle
            }
          >
            🤖 AI Study Coach
          </Text>

          <Text
            style={styles.answerText}
          >
            {answer}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#172033",
    marginTop: 20,
  },

  subtitle: {
    fontSize: 15,
    color: "#667085",
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },

  uploadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderStyle: "dashed",
  },

  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  uploadTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#172033",
    marginBottom: 8,
  },

  uploadDescription: {
    fontSize: 14,
    color: "#667085",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
  },

  uploadButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },

  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  fileCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },

  fileIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  fileIcon: {
    fontSize: 27,
  },

  fileInfo: {
    flex: 1,
  },

  fileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#172033",
  },

  fileSize: {
    fontSize: 13,
    color: "#667085",
    marginTop: 4,
  },

  fileStatus: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 5,
  },

  aiCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },

  aiTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#172033",
    marginBottom: 8,
  },

  aiDescription: {
    fontSize: 14,
    color: "#667085",
    lineHeight: 21,
    marginBottom: 18,
  },

  summaryButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 22,
  },

  summaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  questionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#344054",
    marginBottom: 8,
  },

  questionInput: {
    minHeight: 100,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#172033",
    marginBottom: 12,
  },

  askButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  askButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.6,
  },

  answerCard: {
    marginTop: 20,
    backgroundColor: "#EEF4FF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#C7D7FE",
  },

  answerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1D4ED8",
    marginBottom: 12,
  },

  answerText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#344054",
  },
});