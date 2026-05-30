/**
 * Dynamic MCQ API (Web App)
 * Reads the latest MCQ row from a Google Sheet and returns JSON in the format specified.
 *
 * Response JSON format (must match media.html expectations):
 * {
 *   question: string,
 *   options: { A: string, B: string, C: string, D: string },
 *   correctAnswer: 'A'|'B'|'C'|'D',
 *   explanation: string (optional/empty),
 *   date: string
 * }
 *
 * Deploy as:
 *   - Type: Web app
 *   - Execute as: Me
 *   - Who has access: Anyone (so GitHub-hosted static site can call it)
 *
 * How to use:
 *   1) Open Google Apps Script
 *   2) Paste this file contents
 *   3) Set CONFIG.SHEET_ID and optionally CONFIG.SHEET_NAME + headers
 *   4) Deploy web app
 *   5) Put deployed URL into media.html (PS_MCQ_API_URL)
 */

const CONFIG = {
  // TODO: Paste your Google Sheet ID here (the long string in the URL)
  SHEET_ID: 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE',

  // TODO: Change if your sheet/tab name is different
  SHEET_NAME: 'MCQ',

  // Header names (must match exactly in the first row of your MCQ tab)
  // Required: Date, Question, Option A/B/C/D, Correct Answer
  COLS: {
    date: 'Date',
    question: 'Question',
    a: 'Option A',
    b: 'Option B',
    c: 'Option C',
    d: 'Option D',
    correct: 'Correct Answer',
    explanation: 'Explanation'
  }
};

function doGet() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) return jsonError('Sheet not found: ' + CONFIG.SHEET_NAME, 404);

    const values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) return jsonError('No data rows found.', 404);

    const headers = values[0].map(h => String(h).trim());
    const idx = mapHeaders(headers, CONFIG.COLS);
    if (!idx) return jsonError('Required columns missing in header row.', 400);

    // Consider only rows where Question is present
    const rows = values.slice(1).filter(r => r && String(r[idx.question] ?? '').trim() !== '');
    if (rows.length === 0) return jsonError('No MCQ rows with Question found.', 404);

    // "Latest" by Date column (most recent)
    // Invalid/missing dates sort to the bottom.
    rows.sort((r1, r2) => getRowDateTs(r2, idx.date) - getRowDateTs(r1, idx.date));
    const latest = rows[0];

    const question = safeText(latest[idx.question]);
    const options = {
      A: safeText(latest[idx.a]),
      B: safeText(latest[idx.b]),
      C: safeText(latest[idx.c]),
      D: safeText(latest[idx.d])
    };

    let correctAnswer = safeText(latest[idx.correct]).toUpperCase().trim();
    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      return jsonError('Correct Answer must be one of A/B/C/D. Got: ' + correctAnswer, 400);
    }

    const explanation = idx.explanation != null ? safeText(latest[idx.explanation]) : '';
    const dateStr = stringifyDate(latest[idx.date]);

    const payload = {
      question,
      options,
      correctAnswer,
      explanation,
      date: dateStr
    };

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return jsonError(err && err.message ? err.message : String(err), 500);
  }
}

function mapHeaders(headers, colNames) {
  const getIndex = (name) => headers.indexOf(String(name).trim());

  const required = [
    colNames.date,
    colNames.question,
    colNames.a,
    colNames.b,
    colNames.c,
    colNames.d,
    colNames.correct
  ];

  for (let i = 0; i < required.length; i++) {
    if (getIndex(required[i]) === -1) return null;
  }

  const expIndex = getIndex(colNames.explanation);
  return {
    date: getIndex(colNames.date),
    question: getIndex(colNames.question),
    a: getIndex(colNames.a),
    b: getIndex(colNames.b),
    c: getIndex(colNames.c),
    d: getIndex(colNames.d),
    correct: getIndex(colNames.correct),
    explanation: expIndex === -1 ? null : expIndex
  };
}

function getRowDateTs(row, dateIdx) {
  const v = row[dateIdx];
  if (v instanceof Date) return v.getTime();

  const s = String(v || '').trim();
  if (!s) return 0;

  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

function safeText(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function stringifyDate(v) {
  if (!v && v !== 0) return '';
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).trim();
}

function jsonError(message, statusCode) {
  const payload = { error: message, status: statusCode || 400 };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

