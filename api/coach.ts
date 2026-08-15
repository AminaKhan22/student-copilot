// api/coach.ts

import type { IncomingMessage, ServerResponse } from "node:http";

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

async function readBody(
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
        reject(new Error("Invalid JSON request."));
      }
    });

    req.on("error", reject);
  });
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
  }, 55000);

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

    const rawText = await response.text();

    let data: any;

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(
        "Gemini returned an invalid response."
      );
    }

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        JSON.stringify(data, null, 2)
      );

      throw new Error(
        data?.error?.message ||
          `Gemini request failed with status ${response.status}.`
      );
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(
          (part: { text?: string }) =>
            part?.text || ""
        )
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
    // POST ONLY
    // -------------------------------------------------

    if (req.method !== "POST") {
      sendJSON(res, 405, {
        error: "Method not allowed. Use POST.",
      });
      return;
    }

    // -------------------------------------------------
    // API KEY
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
    // READ JSON
    // -------------------------------------------------

    const body = await readBody(req);

    const question =
      String(body?.question ?? "").trim();

    const studentName =
      String(
        body?.studentName ?? "Student"
      ).trim() || "Student";

    const subjects =
      String(body?.subjects ?? "").trim();

    const currentTask =
      String(body?.currentTask ?? "").trim();

    const remainingTasks =
      Number(body?.remainingTasks ?? 0);

    const focusedMinutes =
      Number(body?.focusedMinutes ?? 0);

    const dailyHours =
      Number(body?.dailyHours ?? 3);

    const pdfBase64 =
      typeof body?.pdfBase64 === "string"
        ? body.pdfBase64
        : "";

    // -------------------------------------------------
    // VALIDATION
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
      remainingTasks: Number.isFinite(
        remainingTasks
      )
        ? remainingTasks
        : 0,
      focusedMinutes: Number.isFinite(
        focusedMinutes
      )
        ? focusedMinutes
        : 0,
      dailyHours: Number.isFinite(
        dailyHours
      )
        ? dailyHours
        : 3,
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