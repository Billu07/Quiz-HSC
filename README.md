# Samas Sprint (HSC Bangla 2nd Paper)

Static quiz app for practicing:
- Samas category detection
- Byasabakya writing

## Language Setup
- Navigation/UI labels: English
- Practice content: Bengali

## Standardized Test System
- Category-wise predefined tests (`Test 01`, `Test 02`, etc.)
- Every question is covered through fixed test packs
- Resume support per category (`Resume Last Test`)
- Retake support for any selected test
- One-click `Start Next Test` and `Retake This Test` after each session

## Practice Tracks
- `Full Pair (Samas + Byasabakya)`
- `Only Byasabakya`
- `Only Samas Category`

## Modes
- `Classic Drill`
- `MCQ Challenge` (4-option multiple choice)
- `Speed Round`
- `Flash Reveal`

## Quiz Flow
- `Next` submits answer and moves forward
- No per-question score reveal in normal flow
- End-of-session `Answer Sheet` shows:
  - your answers
  - correct answers
  - short explanation for each item

## Responsive Behavior
- Mobile-first layout
- Quiz-first page structure
- Tablet and desktop breakpoints

## Files
- `index.html` - structure and UI sections
- `styles.css` - styling and responsive layout
- `app.js` - quiz engine, standardized tests, resume/retake logic
- `data/questions.js` - question bank

## Run Locally
```powershell
python -m http.server 5500
```
Open:
`http://localhost:5500`

## Deploy to Vercel
1. Import this folder in Vercel.
2. Framework preset: `Other` (or no framework).
3. Build command: leave empty.
4. Output directory: root.
5. Deploy.

## Add Questions
Edit `data/questions.js`:
```js
{ id: 108, word: "নতুনশব্দ", byasabakya: "ব্যাসবাক্য", category: "তৎপুরুষ" }
```
