import type { VercelRequest, VercelResponse } from "@vercel/node";
import formidable from "formidable";
import fs from "fs/promises";
import { PDFParse } from "pdf-parse";

export const config = {
  api: {
    bodyParser: false,
  },
};

type ParsedFields = {
  question?: string | string[];
  studentName?: string | string[];
  subjects?: string | string[];
  currentTask?: string | string[];
  remainingTasks?: string | string[];
  focusedMinutes?: string | string[];
  dailyHours?: string | string[];
};

function getField(
  fields: ParsedFields,
  name: keyof ParsedFields,
  fallback = ""
): string {
  const value = fields[name];

  if (Array.isArray(value)) {
    return String(value[0] ?? fallback);
  }

  return String(value ?? fallback);
}

function sendError(
  res: VercelResponse,
  status: number,
  message: string
) {
  return res.status(status).json({
    error: message,
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // --------------------------------------------------
  // CORS
  // --------------------------------------------------

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

  // --------------------------------------------------
  // OPTIONS
  // --------------------------------------------------

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // --------------------------------------------------
  // POST ONLY
  // --------------------------------------------------

  if (req.method !== "POST") {
    return sendError(
      res,
      405,
      "Method not allowed. Use POST."
    );
  }

  try {
    // ------------------------------------------------
    // GEMINI KEY
    // ------------------------------------------------

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY is missing."
      );

      return sendError(
        res,
        500,
        "GEMINI_API_KEY is not configured in Vercel."
      );
    }

    // ------------------------------------------------
    // PARSE MULTIPART FORM
    // ------------------------------------------------

    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 20 * 1024 * 1024,
    });

    const [fields, files] =
      await form.parse(req);

    const parsedFields =
      fields as ParsedFields;

    // ------------------------------------------------
    // GET QUESTION
    // ------------------------------------------------

    const question =
      getField(
        parsedFields,
        "question"
      ).trim();

    const studentName =
      getField(
        parsedFields,
        "studentName",
        "Student"
      ).trim();

    const subjects =
      getField(
        parsedFields,
        "subjects",
        "Course Material"
      ).trim();

    const currentTask =
      getField(
        parsedFields,
        "currentTask"
      ).trim();

    const remainingTasks =
      Number(
        getField(
          parsedFields,
          "remainingTasks",
          "0"
        )
      );

    const focusedMinutes =
      Number(
        getField(
          parsedFields,
          "focusedMinutes",
          "0"
        )
      );

    const dailyHours =
      Number(
        getField(
          parsedFields,
          "dailyHours",
          "3"
        )
      );

    // ------------------------------------------------
    // VALIDATE QUESTION
    // ------------------------------------------------

    if (!question) {
      return sendError(
        res,
        400,
        "Please enter a question."
      );
    }

    // ------------------------------------------------
    // FIND PDF
    // ------------------------------------------------

    const pdfFileValue =
      (files as any)?.pdf;

    const pdfFile = Array.isArray(
      pdfFileValue
    )
      ? pdfFileValue[0]
      : pdfFileValue;

    if (!pdfFile) {
      return sendError(
        res,
        400,
        "No PDF file was uploaded."
      );
    }

    const filePath =
      pdfFile.filepath;

    if (!filePath) {
      return sendError(
        res,
        400,
        "Uploaded PDF could not be accessed."
      );
    }

    console.log(
      "PDF received:",
      pdfFile.originalFilename
    );

    // ------------------------------------------------
    // READ PDF
    // ------------------------------------------------

    const pdfBuffer =
      await fs.readFile(filePath);

    if (!pdfBuffer.length) {
      return sendError(
        res,
        400,
        "The uploaded PDF is empty."
      );
    }

    console.log(
      "PDF size:",
      pdfBuffer.length,
      "bytes"
    );

    // ------------------------------------------------
    // EXTRACT PDF TEXT
    // ------------------------------------------------

    const parser = new PDFParse({
  data: pdfBuffer,
});

const pdfData = await parser.getText();

const extractedText =
  String(
    pdfData?.text ?? ""
  ).trim();

await parser.destroy();

    // ------------------------------------------------
    // LIMIT PDF TEXT
    // ------------------------------------------------
    //
    // Prevent extremely large PDFs from creating
    // an unnecessarily huge Gemini request.
    //

    const MAX_PDF_CHARS = 60000;

    const pdfText =
      extractedText.length >
      MAX_PDF_CHARS
        ? extractedText.slice(
            0,
            MAX_PDF_CHARS
          ) +
          "\n\n[PDF text truncated because it was too long.]"
        : extractedText;

    // ------------------------------------------------
    // STUDY COACH PROMPT
    // ------------------------------------------------

    const prompt = `
You are AI Study Coach inside a student productivity application.

Your job is to help the student understand the uploaded course material.

STUDENT INFORMATION
-------------------

Student name:
${studentName}

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


IMPORTANT RULE
--------------

The uploaded PDF is the MAIN SOURCE for answering the student's question.

Use the PDF content carefully.

Do NOT invent information and do NOT pretend something is in the PDF when it is not.

If the answer cannot be found or reasonably determined from the PDF, clearly say:

"The uploaded PDF does not provide enough information to answer this."

You may use general academic knowledge only when it helps explain information that is already present in the PDF.


FORMATTING RULES
----------------

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

If the student asks a numerical question, use:

1. GIVEN
2. FIND
3. FORMULA
4. SUBSTITUTION
5. CALCULATION
6. FINAL ANSWER

Always include units where applicable.


CONCEPTUAL QUESTIONS
--------------------

For conceptual questions, use:

1. Definition
2. Simple explanation
3. How it works
4. Example
5. Important points
6. Short takeaway


SUMMARY REQUESTS
----------------

If the student asks for a summary:

- Identify the main concepts.
- Include important definitions.
- Include important formulas.
- Include key points.
- Mention exam-important information.
- Organize the answer with headings and bullets.
- Do not make the summary unnecessarily long.


ANSWER STYLE
------------

Be:

- clear
- accurate
- organized
- student-friendly
- concise but helpful

Use simple language.

Do not use unnecessary complicated wording.


UPLOADED PDF CONTENT
====================

${pdfText}


STUDENT QUESTION
================

${question}
`;

    // ------------------------------------------------
    // CALL GEMINI
    // ------------------------------------------------

    console.log(
      "Sending PDF content to Gemini..."
    );

    const geminiResponse =
      await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            "x-goog-api-key":
              apiKey,
          },

          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],

            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4000,
            },
          }),
        }
      );

    const geminiData =
      await geminiResponse.json();

    // ------------------------------------------------
    // GEMINI ERROR
    // ------------------------------------------------

    if (!geminiResponse.ok) {
      console.error(
        "Gemini API error:",
        JSON.stringify(
          geminiData,
          null,
          2
        )
      );

      return sendError(
        res,
        500,
        geminiData?.error?.message ||
          "Gemini request failed."
      );
    }

    // ------------------------------------------------
    // EXTRACT ANSWER
    // ------------------------------------------------

    const answer =
      geminiData
        ?.candidates?.[0]
        ?.content
        ?.parts
        ?.map(
          (part: {
            text?: string;
          }) =>
            part?.text || ""
        )
        .join("")
        .trim();

    if (!answer) {
      console.error(
        "Gemini returned no answer:",
        JSON.stringify(
          geminiData,
          null,
          2
        )
      );

      return sendError(
        res,
        500,
        "The AI returned an empty response."
      );
    }

    // ------------------------------------------------
    // SUCCESS
    // ------------------------------------------------

    console.log(
      "Study Coach response generated successfully."
    );

    return res.status(200).json({
      answer,
    });
  } catch (error) {
    // ------------------------------------------------
    // SERVER ERROR
    // ------------------------------------------------

    console.error(
      "Study Coach server error:",
      error
    );

    return sendError(
      res,
      500,
      error instanceof Error
        ? error.message
        : "Something went wrong while contacting Study Coach."
    );
  }
}