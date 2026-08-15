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
        result.assets?.length
      ) {
        const file = result.assets[0];

        setSelectedFile(file);
        setAnswer("");
        setQuestion("");

        Alert.alert(
          "PDF Selected",
          `${file.name} has been selected successfully.`
        );
      }
    } catch (error) {
      console.error(
        "PDF picker error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not select the PDF."
      );
    }
  };

  // =====================================================
  // PDF → BASE64
  // =====================================================

  const pdfToBase64 = async (
    file: DocumentPicker.DocumentPickerAsset
  ): Promise<string> => {
    // ---------------------------------------------------
    // WEB
    // ---------------------------------------------------

    const webFile =
      (file as any).file;

    if (webFile) {
      console.log(
        "PDF source: Web File"
      );

      const arrayBuffer =
        await webFile.arrayBuffer();

      const bytes =
        new Uint8Array(
          arrayBuffer
        );

      let binary = "";

      const chunkSize =
        0x8000;

      for (
        let i = 0;
        i < bytes.length;
        i += chunkSize
      ) {
        const chunk =
          bytes.subarray(
            i,
            Math.min(
              i + chunkSize,
              bytes.length
            )
          );

        binary += String.fromCharCode(
          ...chunk
        );
      }

      return btoa(binary);
    }

    // ---------------------------------------------------
    // NATIVE
    // ---------------------------------------------------

    console.log(
      "PDF source: Native URI"
    );

    const response =
      await fetch(file.uri);

    if (!response.ok) {
      throw new Error(
        "Could not read the PDF file."
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    const bytes =
      new Uint8Array(
        arrayBuffer
      );

    let binary = "";

    const chunkSize =
      0x8000;

    for (
      let i = 0;
      i < bytes.length;
      i += chunkSize
    ) {
      const chunk =
        bytes.subarray(
          i,
          Math.min(
            i + chunkSize,
            bytes.length
          )
        );

      binary += String.fromCharCode(
        ...chunk
      );
    }

    return btoa(binary);
  };

  // =====================================================
  // SEND PDF TO AI
  // =====================================================

  const sendPDFToAI = async (
    prompt: string
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
        "Reading PDF..."
      );

      const pdfBase64 =
        await pdfToBase64(
          selectedFile
        );

      console.log(
        "PDF converted to Base64."
      );

      console.log(
        "PDF Base64 length:",
        pdfBase64.length
      );

      // -------------------------------------------------
      // SEND TO OUR WORKING BACKEND
      // -------------------------------------------------

      const response =
        await fetch(
          API_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              question: prompt,

              studentName:
                "Student",

              subjects:
                "Course Material",

              pdfBase64:
                pdfBase64,
            }),
          }
        );

      console.log(
        "Server status:",
        response.status
      );

      const text =
        await response.text();

      console.log(
        "Server response:",
        text.substring(
          0,
          2000
        )
      );

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Request failed (${response.status}).`
        );
      }

      if (
        typeof data?.answer !==
        "string" ||
        !data.answer.trim()
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
        `PDF AI could not process this file.\n\nError: ${message}`
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
      `Read the uploaded PDF carefully.

Create a comprehensive study summary for a university student.

Include:

1. OVERVIEW
2. MAIN TOPICS
3. IMPORTANT CONCEPTS
4. IMPORTANT DEFINITIONS
5. IMPORTANT FORMULAS
6. IMPORTANT EXAMPLES
7. KEY POINTS
8. EXAM-IMPORTANT INFORMATION
9. SHORT REVISION NOTES

Use the uploaded PDF as the primary source.

Do not invent information that is not supported by the PDF.

Make the explanation clear, organized, and useful for exam preparation.`
    );
  };

  // =====================================================
  // ASK QUESTION
  // =====================================================

  const askQuestion = async () => {
    const q =
      question.trim();

    if (!q) {
      Alert.alert(
        "Enter a question",
        "Please type a question about your PDF."
      );
      return;
    }

    await sendPDFToAI(
      `Answer the following question using the uploaded PDF as the primary source.

QUESTION:

${q}

Instructions:

- Read the relevant parts of the PDF.
- Give a complete answer.
- Explain the concept clearly.
- Include formulas or examples if they appear in the PDF.
- Do not invent information.
- If the PDF does not contain enough information to answer the question, clearly state that.`
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
        Upload your course material
        and study it with AI.
      </Text>

      {/* UPLOAD */}

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
          assignments, or other
          course material.
        </Text>

        <Pressable
          style={
            styles.uploadButton
          }
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

      {/* FILE */}

      {selectedFile && (
        <View style={styles.fileCard}>
          <View
            style={
              styles.fileIconContainer
            }
          >
            <Text
              style={styles.fileIcon}
            >
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

      {/* AI */}

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
            Gemini can read your PDF,
            summarize the material,
            and answer questions
            about it.
          </Text>

          {/* SUMMARY */}

          <Pressable
            style={[
              styles.summaryButton,
              loading &&
                styles.disabledButton,
            ]}
            onPress={
              summarizePDF
            }
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
            Ask a question about
            this PDF
          </Text>

          <TextInput
            style={
              styles.questionInput
            }
            placeholder="Example: Explain Newton's second law from this material."
            placeholderTextColor="#98A2B3"
            value={question}
            onChangeText={
              setQuestion
            }
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
            onPress={
              askQuestion
            }
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

      {/* ANSWER */}

      {answer ? (
        <View
          style={
            styles.answerCard
          }
        >
          <Text
            style={
              styles.answerTitle
            }
          >
            🤖 AI PDF Coach
          </Text>

          <Text
            style={
              styles.answerText
            }
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