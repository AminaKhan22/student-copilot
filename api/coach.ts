// api/coach.ts

import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";

export const config = {
  api: {
    bodyParser: false,
  },
};

const GEMINI_MODEL = "gemini-3.6-flash";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

function sendJSON(
  res: ServerResponse,
  status: number,
  data: unknown
) {
  res.statusCode = status;

  res.setHeader(
    "Content-Type",
    "application/json"
  );

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
        resolve(
          body
            ? JSON.parse(body)
            : {}
        );
      } catch {
        reject(
          new Error(
            "Invalid JSON request."
          )
        );
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

Student:
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
- mathematics
- physics
- engineering
- programming
- concepts
- formulas
- numerical problems
- exam preparation
- revision
- study planning


MATHEMATICAL FORMAT

Do NOT use LaTeX.

Use simple notation:

F = ma
V = IR
P = VI
v = u + at
s = ut + 1/2 at²
E = mc²
√x
x²
Δ
Ω
α
β
θ


NUMERICAL QUESTIONS

Use:

1. GIVEN
2. FIND
3. FORMULA
4. SUBSTITUTION
5. CALCULATION
6. FINAL ANSWER

Always include units.

Show calculations clearly.


CONCEPTUAL QUESTIONS

Use:

1. Definition
2. Simple explanation
3. How it works
4. Example
5. Important points
6. Short takeaway


STUDY QUESTIONS

Give realistic and practical advice.

Prioritize important topics and exam-relevant information.


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
): Promise<string> {
  const input: any[] = [
    {
      type: "text",
      text: prompt,
    },
  ];

  // -------------------------------------------------
  // PDF
  // -------------------------------------------------

  if (pdfBase64) {
    input.push({
      type: "document",
      data: pdfBase64,
      mime_type: "application/pdf",
    });
  }

  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 55000);

  try {
    const response = await fetch(
      GEMINI_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            apiKey,
        },

        body: JSON.stringify({
          model: GEMINI_MODEL,

          input: input,
        }),

        signal: controller.signal,
      }
    );

    const rawText =
      await response.text();

    console.log(
      "Gemini status:",
      response.status
    );

    console.log(
      "Gemini response:",
      rawText.substring(
        0,
        3000
      )
    );

    let data: any = {};

    try {
      data = rawText
        ? JSON.parse(rawText)
        : {};
    } catch {
      throw new Error(
        "Gemini returned an invalid response."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
          `Gemini request failed with status ${response.status}.`
      );
    }

    // -------------------------------------------------
    // Interactions API output
    // -------------------------------------------------

    let answer = "";

    if (
      typeof data?.output_text ===
      "string"
    ) {
      answer =
        data.output_text.trim();
    }

    // -------------------------------------------------
    // Fallback: read output steps
    // -------------------------------------------------

    if (
      !answer &&
      Array.isArray(data?.steps)
    ) {
      for (
        const step of data.steps
      ) {
        if (
          step?.type !==
          "model_output"
        ) {
          continue;
        }

        if (
          Array.isArray(
            step?.content
          )
        ) {
          for (
            const item of
              step.content
          ) {
            if (
              item?.type === "text" &&
              typeof item?.text ===
                "string"
            ) {
              answer +=
                item.text;
            }
          }
        }
      }

      answer =
        answer.trim();
    }

    if (!answer) {
      throw new Error(
        "Gemini returned an empty answer."
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

    if (
      req.method ===
      "OPTIONS"
    ) {
      res.statusCode = 204;
      res.end();
      return;
    }

    // -------------------------------------------------
    // POST ONLY
    // -------------------------------------------------

    if (
      req.method !==
      "POST"
    ) {
      sendJSON(res, 405, {
        error:
          "Method not allowed. Use POST.",
      });

      return;
    }

    // -------------------------------------------------
    // API KEY
    // -------------------------------------------------

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      sendJSON(res, 500, {
        error:
          "GEMINI_API_KEY is missing from Vercel.",
      });

      return;
    }

    // -------------------------------------------------
    // READ REQUEST
    // -------------------------------------------------

    const body =
      await readBody(req);

    const question =
      String(
        body?.question ?? ""
      ).trim();

    if (!question) {
      sendJSON(res, 400, {
        error:
          "Please enter a question.",
      });

      return;
    }

    const studentName =
      String(
        body?.studentName ??
          "Student"
      ).trim() ||
      "Student";

    const subjects =
      String(
        body?.subjects ?? ""
      ).trim();

    const currentTask =
      String(
        body?.currentTask ?? ""
      ).trim();

    const remainingTasks =
      Number(
        body?.remainingTasks ??
          0
      );

    const focusedMinutes =
      Number(
        body?.focusedMinutes ??
          0
      );

    const dailyHours =
      Number(
        body?.dailyHours ??
          3
      );

    const pdfBase64 =
      typeof body?.pdfBase64 ===
      "string"
        ? body.pdfBase64
        : "";

    // -------------------------------------------------
    // BUILD PROMPT
    // -------------------------------------------------

    const prompt =
      buildPrompt({
        question,

        studentName,

        subjects,

        currentTask,

        remainingTasks:
          Number.isFinite(
            remainingTasks
          )
            ? remainingTasks
            : 0,

        focusedMinutes:
          Number.isFinite(
            focusedMinutes
          )
            ? focusedMinutes
            : 0,

        dailyHours:
          Number.isFinite(
            dailyHours
          )
            ? dailyHours
            : 3,
      });

    // -------------------------------------------------
    // CALL GEMINI
    // -------------------------------------------------

    const answer =
      await callGemini(
        apiKey,
        prompt,
        pdfBase64 ||
          undefined
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
      error.name ===
        "AbortError"
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
          : "Study Coach failed.",
    });
  }
}