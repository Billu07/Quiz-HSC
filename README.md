# Samas Sprint (HSC Bangla 2nd Paper)

Simple static quiz app for practicing:
- সমাস নির্ণয়
- ব্যাসবাক্য

## Language Setup
- Navigation/UI labels: English
- Practice content: Bengali

## Practice Tracks
- `Full Pair (সমাস + ব্যাসবাক্য)`
- `Only ব্যাসবাক্য`
- `Only সমস্তপদ`

## Responsive Behavior
- Mobile-first layout (small screens are default)
- Tablet and desktop enhancements via media queries

## Files
- `index.html` - app structure
- `styles.css` - visual design + responsive layout
- `app.js` - quiz logic (`Classic`, `Speed`, `Flash`)
- `data/questions.js` - editable question bank
- `1.jpeg` to `6.jpeg` - source sheets (shown in app)

## Run Locally
Any static server is enough.

Example:
```powershell
python -m http.server 5500
```
Then open:
`http://localhost:5500`

## Deploy to Vercel
1. Create/import this folder as a Vercel project.
2. Framework preset: `Other` (or no framework).
3. Build command: leave empty.
4. Output directory: leave empty (root).
5. Deploy.

## Add or Edit Questions
Edit `data/questions.js` entries:
```js
{ id: 108, word: "নতুনশব্দ", byasabakya: "ব্যাসবাক্য", category: "তৎপুরুষ" }
```

Allowed categories in this app:
- `তৎপুরুষ`
- `কর্মধারয়`
- `বহুব্রীহি`
- `দ্বন্দ্ব`
- `দ্বিগু`
- `অব্যয়ীভাব`
- `নিত্য`
- `প্রাদি`
