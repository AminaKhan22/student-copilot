// api/coach.ts

import formidable from "formidable";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

// Vercel Node.js runtime
export const config = {
  api: {
    bodyParser: false,
  },
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function sendJSON(
  res: ServerResponse,
  status: number,
  data: unknown
) {
  res.statusCode = status;

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.end(JSON.stringify(data));
}

function getFirst(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? "");
  }

  return String(value ?? "");
}

function getNumber(
  value: unknown,
  fallback: number
): number {
  const number = Number(getFirst(value));

  return Number.isFinite(number)
    ? number
    : fallback;
}

function buildPrompt(data: {
  question: string;
  studentName: string;
  subjects: string;
  currentTask: string;
  remainingTasks: number;
  focusedMinutes: number;
  dailyHours: number;
}) {
  return `
You are Study Coach, an AI academic assistant inside a student productivity application.

STUDENT INFORMATION

Student name:
${data.studentName || "Student"}

Subjects:
${data.subjects || "Not provided"}

Current task:
${data.currentTask || "Not provided"}

Remaining tasks:
${data.remainingTasks}

Focused study minutes:
${data.focusedMinutes}

Daily study target:
${data.dailyHours} hours


YOUR ROLE

Help the student with:

- academic questions
- concepts
- formulas
- numerical problems
- programming
- engineering
- mathematics
- physics
- exam preparation
- revision
- study planning


IMPORTANT MATHEMATICAL FORMATTING

Do NOT use LaTeX.

Use simple readable mathematical notation.

Examples:

F = ma
v = u + at
s = ut + 1/2 at²
E = mc²
V = IR
P = VI

For fractions:
1/2

For square roots:
√x

For multiplication:
×

For powers:
x²
x³
xⁿ

For subscripts:
V₁
V₂
I₁
I₂

For Greek letters:
α β γ θ λ μ π σ ω Δ Ω


NUMERICAL QUESTIONS

For numerical questions use:

1. GIVEN
2. FIND
3. FORMULA
4. SUBSTITUTION
5. CALCULATION
6. FINAL ANSWER

Always include units where applicable.

Show calculations clearly.


CONCEPTUAL QUESTIONS

For conceptual questions give:

1. Definition
2. Simple explanation
3. How it works
4. Example
5. Important points
6. Short takeaway


STUDY QUESTIONS

If the student asks for study planning, revision, or exam preparation:

- Give practical steps.
- Keep the plan realistic.
- Prioritize important topics.
- Use simple language.
- Consider the student's available study time.


ANSWER STYLE

Be:

- clear
- accurate
- organized
- student-friendly
- concise but helpful

Use headings and numbered lists when useful.

Do not use unnecessarily complicated language.


STUDENT REQUEST

${data.question}
`;
}

async function callGemini(
  apiKey: string,
  prompt: string,
  pdfBase64?: string
) {
  const parts: any[] = [
    {
      text: prompt,
    },
  ];

  if (pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64,
      },
    });
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 50000);

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },

      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],

        generationConfig: {
          maxOutputTokens: 3000,
        },
      }),

      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        JSON.stringify(data, null, 2)
      );

      throw new Error(
        data?.error?.message ||
          `Gemini request failed with status ${response.status}`
      );
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part?.text || "")
        .join("")
        .trim();

    if (!answer) {
      throw new Error(
        "Gemini returned an empty response."
      );
    }

    return answer;
  } finally {
    clearTimeout(timeout);
  }
}

function parseMultipart(
  req: IncomingMessage
): Promise<{
  fields: formidable.Fields;
  files: formidable.Files;
}> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 20 * 1024 * 1024,
    });

    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        fields,
        files,
      });
    });
  });
}

async function readJSONBody(
  req: IncomingMessage
): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(
          new Error("Invalid JSON request.")
        );
      }
    });

    req.on("error", reject);
  });
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  try {
    // -------------------------------------------------
    // CORS
    // -------------------------------------------------

    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "POST, OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );

    // -------------------------------------------------
    // OPTIONS
    // -------------------------------------------------

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    // -------------------------------------------------
    // ONLY POST
    // -------------------------------------------------

    if (req.method !== "POST") {
      sendJSON(res, 405, {
        error: "Method not allowed. Use POST.",
      });

      return;
    }

    // -------------------------------------------------
    // GEMINI KEY
    // -------------------------------------------------

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      sendJSON(res, 500, {
        error:
          "GEMINI_API_KEY is not configured in Vercel.",
      });

      return;
    }

    // -------------------------------------------------
    // DATA
    // -------------------------------------------------

    let question = "";
    let studentName = "Student";
    let subjects = "";
    let currentTask = "";
    let remainingTasks = 0;
    let focusedMinutes = 0;
    let dailyHours = 3;

    let pdfBase64 = "";

    const contentType =
      String(req.headers["content-type"] || "")
        .toLowerCase();

    // -------------------------------------------------
    // PDF / MULTIPART REQUEST
    // -------------------------------------------------

    if (contentType.includes("multipart/form-data")) {
      const { fields, files } =
        await parseMultipart(req);

      question = getFirst(fields.question).trim();

      studentName =
        getFirst(fields.studentName).trim() ||
        "Student";

      subjects =
        getFirst(fields.subjects).trim();

      currentTask =
        getFirst(fields.currentTask).trim();

      remainingTasks = getNumber(
        fields.remainingTasks,
        0
      );

      focusedMinutes = getNumber(
        fields.focusedMinutes,
        0
      );

      dailyHours = getNumber(
        fields.dailyHours,
        3
      );

      // ---------------------------------------------
      // PDF FILE
      // ---------------------------------------------

      const uploadedPDF = files.pdf;

      const pdfFile = Array.isArray(uploadedPDF)
        ? uploadedPDF[0]
        : uploadedPDF;

      if (pdfFile) {
        const filePath = pdfFile.filepath;

        if (!filePath) {
          sendJSON(res, 400, {
            error:
              "The PDF was received but no file path was available.",
          });

          return;
        }

        const pdfBuffer =
          await fs.promises.readFile(filePath);

        pdfBase64 =
          pdfBuffer.toString("base64");
      }
    }

    // -------------------------------------------------
    // NORMAL JSON REQUEST
    // -------------------------------------------------

    else {
      const body = await readJSONBody(req);

      question =
        String(body?.question ?? "").trim();

      studentName =
        String(
          body?.studentName ?? "Student"
        ).trim() || "Student";

      subjects =
        String(body?.subjects ?? "").trim();

      currentTask =
        String(body?.currentTask ?? "").trim();

      remainingTasks = Number(
        body?.remainingTasks ?? 0
      );

      focusedMinutes = Number(
        body?.focusedMinutes ?? 0
      );

      dailyHours = Number(
        body?.dailyHours ?? 3
      );
    }

    // -------------------------------------------------
    // VALIDATE
    // -------------------------------------------------

    if (!question) {
      sendJSON(res, 400, {
        error: "Please enter a question.",
      });

      return;
    }

    // -------------------------------------------------
    // PROMPT
    // -------------------------------------------------

    const prompt = buildPrompt({
      question,
      studentName,
      subjects,
      currentTask,
      remainingTasks,
      focusedMinutes,
      dailyHours,
    });

    // -------------------------------------------------
    // GEMINI
    // -------------------------------------------------

    const answer = await callGemini(
      apiKey,
      prompt,
      pdfBase64 || undefined
    );

    // -------------------------------------------------
    // SUCCESS
    // -------------------------------------------------

    sendJSON(res, 200, {
      answer,
    });
  } catch (error) {
    console.error(
      "Study Coach server error:",
      error
    );

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      sendJSON(res, 504, {
        error:
          "Gemini took too long to respond. Please try again.",
      });

      return;
    }

    sendJSON(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong while contacting Study Coach.",
    });
  }
}