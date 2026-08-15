// api/coach.ts

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type CoachRequestBody = {
  question?: string;
  studentName?: string;
  subjects?: string;
  currentTask?: string;
  remainingTasks?: number;
  focusedMinutes?: number;
  dailyHours?: number;
};

function jsonResponse(
  data: unknown,
  status = 200
): Response {
  return Response.json(data, {
    status,
    headers: CORS_HEADERS,
  });
}

export default async function handler(
  request: Request
): Promise<Response> {
  try {
    // =====================================================
    // CORS
    // =====================================================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // =====================================================
    // ONLY POST
    // =====================================================

    if (request.method !== "POST") {
      return jsonResponse(
        {
          error: "Method not allowed. Use POST.",
        },
        405
      );
    }

    // =====================================================
    // GEMINI API KEY
    // =====================================================

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return jsonResponse(
        {
          error:
            "GEMINI_API_KEY is not configured in Vercel.",
        },
        500
      );
    }

    // =====================================================
    // READ CONTENT TYPE
    // =====================================================

    const contentType =
      request.headers.get("content-type") || "";

    let question = "";
    let studentName = "Student";
    let subjects = "";
    let currentTask = "";
    let remainingTasks = 0;
    let focusedMinutes = 0;
    let dailyHours = 3;

    // PDF data that will be sent to Gemini
    let pdfBase64 = "";

    // =====================================================
    // MULTIPART FORM DATA
    // Used by Course Material PDF
    // =====================================================

    if (
      contentType
        .toLowerCase()
        .includes("multipart/form-data")
    ) {
      // IMPORTANT:
      // `any` avoids the React Native FormData type conflict
      // where TypeScript says `.get()` does not exist.
      const formData: any =
        await request.formData();

      question = String(
        formData.get("question") ?? ""
      ).trim();

      studentName = String(
        formData.get("studentName") ?? "Student"
      ).trim();

      subjects = String(
        formData.get("subjects") ?? ""
      ).trim();

      currentTask = String(
        formData.get("currentTask") ?? ""
      ).trim();

      remainingTasks = Number(
        formData.get("remainingTasks") ?? 0
      );

      focusedMinutes = Number(
        formData.get("focusedMinutes") ?? 0
      );

      dailyHours = Number(
        formData.get("dailyHours") ?? 3
      );

      // ===================================================
      // GET PDF
      // ===================================================

      const pdf = formData.get("pdf");

      if (pdf) {
        try {
          // The uploaded PDF should normally be a File.
          // We intentionally don't use `instanceof File`
          // because that can be unreliable between runtimes.

          if (
            typeof pdf.arrayBuffer === "function"
          ) {
            const pdfBuffer =
              await pdf.arrayBuffer();

            pdfBase64 = Buffer.from(
              pdfBuffer
            ).toString("base64");
          } else if (
            pdf &&
            typeof pdf === "object" &&
            pdf.data
          ) {
            // Extra fallback for file-like objects
            // that expose data directly.

            if (typeof pdf.data === "string") {
              pdfBase64 = pdf.data;
            } else {
              pdfBase64 = Buffer.from(
                pdf.data
              ).toString("base64");
            }
          }
        } catch (pdfError) {
          console.error(
            "PDF conversion error:",
            pdfError
          );

          return jsonResponse(
            {
              error:
                "The PDF was received but could not be processed.",
            },
            400
          );
        }
      }
    }

    // =====================================================
    // NORMAL JSON REQUEST
    // Used by normal Study Coach
    // =====================================================

    else {
      let body: CoachRequestBody;

      try {
        body =
          (await request.json()) as CoachRequestBody;
      } catch {
        return jsonResponse(
          {
            error: "Invalid JSON request.",
          },
          400
        );
      }

      question = String(
        body?.question ?? ""
      ).trim();

      studentName = String(
        body?.studentName ?? "Student"
      ).trim();

      subjects = String(
        body?.subjects ?? ""
      ).trim();

      currentTask = String(
        body?.currentTask ?? ""
      ).trim();

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

    // =====================================================
    // VALIDATE QUESTION
    // =====================================================

    if (!question) {
      return jsonResponse(
        {
          error: "Please enter a question.",
        },
        400
      );
    }

    // =====================================================
    // BUILD PROMPT
    // =====================================================

    let prompt = `
You are Study Coach, an AI academic assistant
inside a student productivity application.

STUDENT INFORMATION
-------------------

Student name:
${studentName || "Student"}

Subjects:
${subjects || "Not provided"}

Current task:
${currentTask || "Not provided"}

Remaining tasks:
${remainingTasks}

Focused study minutes:
${focusedMinutes}

Daily study target:
${dailyHours} hours


YOUR ROLE
---------

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


IMPORTANT FORMATTING RULES
--------------------------

Do NOT use LaTeX.

Use normal readable mathematical notation.

Examples:

F = ma

v = u + at

s = ut + ½at²

E = mc²

V = IR

P = VI

For fractions use:

1/2

For square roots use:

√x

For multiplication use:

×

For powers use:

x²
x³
xⁿ

For subscripts use:

V₁
V₂
I₁
I₂

For Greek letters use:

α β γ θ λ μ π σ ω Δ Ω


NUMERICAL QUESTIONS
-------------------

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
--------------------

For conceptual questions give:

1. Definition
2. Simple explanation
3. How it works
4. Example
5. Important points
6. Short takeaway


STUDY QUESTIONS
---------------

If the student asks for study planning,
revision, or exam preparation:

- Give practical steps.
- Keep the plan realistic.
- Prioritize important topics.
- Use simple language.
- Consider the student's available study time.


ANSWER STYLE
------------

Be:

- clear
- accurate
- organized
- student-friendly
- concise but helpful

Use headings and numbered lists when useful.

Do not use unnecessarily complicated language.


STUDENT REQUEST
---------------

${question}
`;

    // =====================================================
    // GEMINI REQUEST
    // =====================================================

    const parts: any[] = [];

    // Text prompt
    parts.push({
      text: prompt,
    });

    // =====================================================
    // ADD PDF IF PRESENT
    // =====================================================

    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      });
    }

    // =====================================================
    // CALL GEMINI
    // =====================================================

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
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
            temperature: 0.4,
            maxOutputTokens: 4000,
          },
        }),
      }
    );

    // =====================================================
    // READ GEMINI RESPONSE
    // =====================================================

    const data =
      await geminiResponse.json();

    // =====================================================
    // GEMINI ERROR
    // =====================================================

    if (!geminiResponse.ok) {
      console.error(
        "Gemini API error:",
        JSON.stringify(data, null, 2)
      );

      return jsonResponse(
        {
          error:
            data?.error?.message ||
            "Gemini request failed.",
        },
        500
      );
    }

    // =====================================================
    // EXTRACT ANSWER
    // =====================================================

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(
          (part: { text?: string }) =>
            part?.text || ""
        )
        .join("")
        .trim();

    // =====================================================
    // EMPTY RESPONSE
    // =====================================================

    if (!answer) {
      console.error(
        "Gemini returned no answer:",
        JSON.stringify(data, null, 2)
      );

      return jsonResponse(
        {
          error:
            "The AI returned an empty response.",
        },
        500
      );
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    return jsonResponse(
      {
        answer,
      },
      200
    );
  } catch (error) {
    // =====================================================
    // SERVER ERROR
    // =====================================================

    console.error(
      "Study Coach server error:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while contacting Study Coach.",
      },
      500
    );
  }
}