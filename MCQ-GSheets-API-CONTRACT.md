# Dynamic MCQ via Google Sheets + Apps Script (JSON Contract)

## 1) Google Apps Script Web App JSON Response (GET)
Your deployed Apps Script **Web App** should return the latest MCQ as JSON in this exact shape:

```json
{
  "question": "...string...",
  "options": {
    "A": "...string...",
    "B": "...string...",
    "C": "...string...",
    "D": "...string..."
  },
  "correctAnswer": "A|B|C|D",
  "explanation": "...string or empty...",
  "date": "...date string..."
}
```

Notes:
- `correctAnswer` **must** be one of `A`, `B`, `C`, `D` (case-insensitive).
- `options` keys must be exactly `A`,`B`,`C`,`D`.

## 2) What the current `media.html` expects
`media.html` uses:
- `data.question`
- `data.options.A/B/C/D`
- `data.correctAnswer`

So keep those fields present.

## 3) “Latest” rule
Return the row with the most recent value in the `Date` column.

## 4) Google Sheet column names
Header row must match (exact spelling):
- Date
- Question
- Option A
- Option B
- Option C
- Option D
- Correct Answer
- Explanation (optional)

