import questionBank, { MAIN_CATEGORIES } from "./data/questions.js";

const bankCount = document.getElementById("bankCount");
const modeName = document.getElementById("modeName");
const scoreEl = document.getElementById("score");
const attemptedEl = document.getElementById("attempted");
const accuracyEl = document.getElementById("accuracy");
const bestStreakEl = document.getElementById("bestStreak");
const timerEl = document.getElementById("timer");
const categoryFilter = document.getElementById("categoryFilter");
const questionCount = document.getElementById("questionCount");
const practiceTrack = document.getElementById("practiceTrack");
const startBtn = document.getElementById("startBtn");
const modeCards = Array.from(document.querySelectorAll("[data-pick-mode]"));

const quizStage = document.getElementById("quizStage");
const quizCard = document.getElementById("quizCard");
const qIndex = document.getElementById("qIndex");
const qModeTag = document.getElementById("qModeTag");
const qPrompt = document.getElementById("qPrompt");
const qInstruction = document.getElementById("qInstruction");
const answerForm = document.getElementById("answerForm");
const choiceWrap = document.getElementById("choiceWrap");
const textAnswerWrap = document.getElementById("textAnswerWrap");
const textAnswerLabel = document.getElementById("textAnswerLabel");
const textAnswerInput = document.getElementById("textAnswerInput");
const checkBtn = document.getElementById("checkBtn");
const revealBtn = document.getElementById("revealBtn");
const nextBtn = document.getElementById("nextBtn");
const feedback = document.getElementById("feedback");
const flashActions = document.getElementById("flashActions");
const knewBtn = document.getElementById("knewBtn");
const reviewBtn = document.getElementById("reviewBtn");

const STORAGE_KEY = "samas_sprint_progress_v3";

const MODE_LABELS = {
  classic: "Classic Drill",
  speed: "Speed Round",
  flash: "Flash Reveal"
};

const TRACK_LABELS = {
  full: "Full Pair",
  byas_only: "Only ব্যাসবাক্য",
  samas_only: "Only সমাস নির্ণয়"
};

let mode = "classic";
let track = "full";
let queue = [];
let currentIndex = 0;
let activeQuestion = null;
let timerId = null;
let timeLeft = 60;
let sessionScore = { correct: 0, attempted: 0 };
let progress = loadProgress();

init();

function init() {
  bankCount.textContent = String(questionBank.length);

  MAIN_CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  modeCards.forEach((card) => {
    card.addEventListener("click", () => {
      mode = card.dataset.pickMode;
      modeCards.forEach((item) => item.classList.remove("mode-active"));
      card.classList.add("mode-active");
      updateModeHeader();
      timerEl.textContent = mode === "speed" ? "60s" : "--";
    });
  });

  practiceTrack.addEventListener("change", () => {
    track = practiceTrack.value;
    updateModeHeader();
  });

  startBtn.addEventListener("click", startSession);
  answerForm.addEventListener("submit", onSubmitAnswer);
  revealBtn.addEventListener("click", onRevealAnswer);
  nextBtn.addEventListener("click", goNext);
  knewBtn.addEventListener("click", () => onFlashMark(true));
  reviewBtn.addEventListener("click", () => onFlashMark(false));

  updateModeHeader();
  updateProgressUi();
}

function startSession() {
  clearTimer();
  resetSession();

  track = practiceTrack.value;
  const pickedCount = Number(questionCount.value);
  const pickedCategory = categoryFilter.value;

  let filtered = questionBank;
  if (pickedCategory !== "all") {
    filtered = filtered.filter((item) => item.category === pickedCategory);
  }

  if (filtered.length === 0) {
    setFeedback("এই ক্যাটাগরিতে প্রশ্ন নেই। অন্য ক্যাটাগরি বাছাই করো।", "bad");
    feedback.classList.remove("hidden");
    return;
  }

  queue = shuffle([...filtered]).slice(0, Math.min(pickedCount, filtered.length));
  answerForm.classList.remove("hidden");
  quizCard.classList.remove("hidden");

  if (mode === "speed") {
    timeLeft = 60;
    timerEl.textContent = `${timeLeft}s`;
    timerId = window.setInterval(() => {
      timeLeft -= 1;
      timerEl.textContent = `${timeLeft}s`;
      if (timeLeft <= 0) {
        clearTimer();
        finishSession("সময় শেষ");
      }
    }, 1000);
  } else {
    timerEl.textContent = "--";
  }

  quizStage.scrollIntoView({ behavior: "smooth", block: "start" });
  renderQuestion();
}

function renderQuestion() {
  if (currentIndex >= queue.length) {
    finishSession("সেট শেষ");
    return;
  }

  activeQuestion = queue[currentIndex];
  qIndex.textContent = `প্রশ্ন ${currentIndex + 1} / ${queue.length}`;
  qModeTag.textContent = `${MODE_LABELS[mode]} | ${TRACK_LABELS[track]}`;
  qPrompt.textContent = `সমস্তপদ: ${activeQuestion.word}`;

  feedback.classList.add("hidden");
  feedback.classList.remove("ok", "bad");
  nextBtn.classList.add("hidden");
  flashActions.classList.add("hidden");
  textAnswerInput.value = "";
  clearChoices();

  if (mode === "flash") {
    answerForm.classList.remove("hidden");
    choiceWrap.classList.add("hidden");
    textAnswerWrap.classList.add("hidden");
    checkBtn.classList.add("hidden");
    revealBtn.classList.remove("hidden");
    qInstruction.textContent = "প্রথমে উত্তর ভাবো, তারপর Reveal Answer চাপো";
    return;
  }

  answerForm.classList.remove("hidden");
  renderTrackInputs();
}

function renderTrackInputs() {
  checkBtn.classList.remove("hidden");
  revealBtn.classList.remove("hidden");

  if (track === "full") {
    qInstruction.textContent = "সমাস নির্ণয় করো এবং ব্যাসবাক্য লিখো";
    choiceWrap.classList.remove("hidden");
    textAnswerWrap.classList.remove("hidden");
    textAnswerLabel.textContent = "ব্যাসবাক্য লিখো";
    textAnswerInput.placeholder = "উদাহরণ: রাজার পুত্র";
    checkBtn.textContent = "Check";
    renderChoices();
    return;
  }

  if (track === "byas_only") {
    qInstruction.textContent = "সঠিক ব্যাসবাক্য লিখো";
    choiceWrap.classList.add("hidden");
    textAnswerWrap.classList.remove("hidden");
    textAnswerLabel.textContent = "ব্যাসবাক্য লিখো";
    textAnswerInput.placeholder = "উদাহরণ: রাজার পুত্র";
    checkBtn.textContent = "Check";
    return;
  }

  qInstruction.textContent = "সঠিক সমাসের নাম নির্ণয় করো";
  choiceWrap.classList.remove("hidden");
  textAnswerWrap.classList.add("hidden");
  checkBtn.textContent = "Check";
  renderChoices();
}

function renderChoices() {
  choiceWrap.innerHTML = "";
  MAIN_CATEGORIES.forEach((category) => {
    const label = document.createElement("label");
    label.className = "choice";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "categoryChoice";
    radio.value = category;

    const text = document.createElement("span");
    text.textContent = category;

    label.append(radio, text);
    choiceWrap.appendChild(label);
  });
}

function clearChoices() {
  choiceWrap.innerHTML = "";
}

function onSubmitAnswer(event) {
  event.preventDefault();
  if (!activeQuestion) {
    return;
  }

  if (track === "full") {
    checkFullTrack();
    return;
  }

  if (track === "byas_only") {
    checkByasOnly();
    return;
  }

  checkSamasOnly();
}

function checkFullTrack() {
  const selectedCategory = getCheckedCategory();
  if (!selectedCategory) {
    setFeedback("একটি সমাসের নাম নির্বাচন করো।", "bad");
    feedback.classList.remove("hidden");
    return;
  }

  const userByas = textAnswerInput.value.trim();
  if (!userByas) {
    setFeedback("ব্যাসবাক্য ঘরটি পূরণ করো।", "bad");
    feedback.classList.remove("hidden");
    return;
  }

  const categoryCorrect = selectedCategory === activeQuestion.category;
  const byasCorrect = isByasCorrect(userByas, activeQuestion.byasabakya);
  const correct = categoryCorrect && byasCorrect;

  registerResult(correct);

  const resultText = [
    `<p><strong>${correct ? "চমৎকার!" : "আরেকবার চেষ্টা করো"}</strong></p>`,
    `<p><strong>সমাস:</strong> ${selectedCategory} (${categoryCorrect ? "সঠিক" : "ভুল"})</p>`,
    `<p><strong>ব্যাসবাক্য:</strong> ${escapeHtml(userByas)} (${byasCorrect ? "সঠিক" : "ভুল"})</p>`,
    `<p><strong>সঠিক সমাস:</strong> ${activeQuestion.category}</p>`,
    `<p><strong>রেফারেন্স ব্যাসবাক্য:</strong> ${activeQuestion.byasabakya}</p>`
  ].join("");

  showResult(resultText, correct);
}

function checkByasOnly() {
  const userByas = textAnswerInput.value.trim();
  if (!userByas) {
    setFeedback("ব্যাসবাক্য লিখে তারপর Check করো।", "bad");
    feedback.classList.remove("hidden");
    return;
  }

  const correct = isByasCorrect(userByas, activeQuestion.byasabakya);
  registerResult(correct);

  const resultText = [
    `<p><strong>${correct ? "সঠিক হয়েছে" : "ভুল হয়েছে"}</strong></p>`,
    `<p><strong>তোমার ব্যাসবাক্য:</strong> ${escapeHtml(userByas)}</p>`,
    `<p><strong>রেফারেন্স ব্যাসবাক্য:</strong> ${activeQuestion.byasabakya}</p>`,
    `<p><strong>সমাস:</strong> ${activeQuestion.category}</p>`
  ].join("");

  showResult(resultText, correct);
}

function checkSamasOnly() {
  const selectedCategory = getCheckedCategory();
  if (!selectedCategory) {
    setFeedback("একটি সমাসের নাম নির্বাচন করো।", "bad");
    feedback.classList.remove("hidden");
    return;
  }

  const correct = selectedCategory === activeQuestion.category;
  registerResult(correct);

  const resultText = [
    `<p><strong>${correct ? "সঠিক হয়েছে" : "ভুল হয়েছে"}</strong></p>`,
    `<p><strong>তোমার উত্তর:</strong> ${selectedCategory}</p>`,
    `<p><strong>সঠিক সমাস:</strong> ${activeQuestion.category}</p>`,
    `<p><strong>ব্যাসবাক্য:</strong> ${activeQuestion.byasabakya}</p>`
  ].join("");

  showResult(resultText, correct);
}

function onRevealAnswer() {
  if (!activeQuestion) {
    return;
  }

  const resultText = [
    `<p><strong>সঠিক সমাস:</strong> ${activeQuestion.category}</p>`,
    `<p><strong>ব্যাসবাক্য:</strong> ${activeQuestion.byasabakya}</p>`
  ].join("");

  setFeedback(resultText, "ok");
  feedback.classList.remove("hidden");

  if (mode === "flash") {
    flashActions.classList.remove("hidden");
    return;
  }

  nextBtn.classList.remove("hidden");
}

function onFlashMark(correct) {
  registerResult(correct);
  goNext();
}

function showResult(message, isCorrect) {
  if (mode === "speed") {
    setFeedback(message, isCorrect ? "ok" : "bad");
    feedback.classList.remove("hidden");
    window.setTimeout(goNext, 520);
    return;
  }

  setFeedback(message, isCorrect ? "ok" : "bad");
  feedback.classList.remove("hidden");
  nextBtn.classList.remove("hidden");
}

function goNext() {
  currentIndex += 1;
  renderQuestion();
}

function finishSession(reason) {
  clearTimer();
  activeQuestion = null;
  answerForm.classList.add("hidden");
  flashActions.classList.add("hidden");
  nextBtn.classList.add("hidden");

  qIndex.textContent = "Session Complete";
  qModeTag.textContent = `${MODE_LABELS[mode]} | ${TRACK_LABELS[track]}`;
  qPrompt.textContent = `চমৎকার! ${reason}`;
  qInstruction.textContent = "নতুন সেটের জন্য Start Session চাপো";

  setFeedback(
    `<p><strong>এই সেশনের ফল:</strong> ${sessionScore.correct} / ${sessionScore.attempted}</p>`,
    "ok"
  );
  feedback.classList.remove("hidden");
}

function registerResult(correct) {
  sessionScore.attempted += 1;
  if (correct) {
    sessionScore.correct += 1;
    progress.currentStreak += 1;
  } else {
    progress.currentStreak = 0;
  }

  progress.attempted += 1;
  if (correct) {
    progress.correct += 1;
  }
  progress.bestStreak = Math.max(progress.bestStreak, progress.currentStreak);
  saveProgress(progress);
  updateProgressUi();
}

function updateProgressUi() {
  scoreEl.textContent = String(progress.correct);
  attemptedEl.textContent = String(progress.attempted);
  bestStreakEl.textContent = String(progress.bestStreak);

  const accuracy = progress.attempted > 0
    ? Math.round((progress.correct / progress.attempted) * 100)
    : 0;
  accuracyEl.textContent = `${accuracy}%`;
}

function updateModeHeader() {
  modeName.textContent = `${MODE_LABELS[mode]} • ${TRACK_LABELS[track]}`;
}

function getCheckedCategory() {
  const selected = document.querySelector('input[name="categoryChoice"]:checked');
  return selected ? selected.value : "";
}

function isByasCorrect(userText, expectedText) {
  const user = normalizeSentence(userText);
  const expected = normalizeSentence(expectedText);

  if (!user || !expected) {
    return false;
  }
  if (user === expected) {
    return true;
  }
  if (user.length >= 7 && (expected.includes(user) || user.includes(expected))) {
    return true;
  }

  const userTokens = user.split(" ").filter(Boolean);
  const expectedTokens = expected.split(" ").filter(Boolean);
  if (!userTokens.length || !expectedTokens.length) {
    return false;
  }

  let common = 0;
  expectedTokens.forEach((token) => {
    if (userTokens.includes(token)) {
      common += 1;
    }
  });

  const expectedCoverage = common / expectedTokens.length;
  const userCoverage = common / userTokens.length;
  return expectedCoverage >= 0.75 && userCoverage >= 0.6;
}

function normalizeSentence(text) {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"?।]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clearTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function resetSession() {
  queue = [];
  currentIndex = 0;
  activeQuestion = null;
  sessionScore = { correct: 0, attempted: 0 };
  feedback.classList.add("hidden");
}

function setFeedback(message, type) {
  feedback.innerHTML = message;
  feedback.classList.remove("ok", "bad");
  feedback.classList.add(type === "ok" ? "ok" : "bad");
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { correct: 0, attempted: 0, currentStreak: 0, bestStreak: 0 };
    }
    const parsed = JSON.parse(raw);
    return {
      correct: Number(parsed.correct) || 0,
      attempted: Number(parsed.attempted) || 0,
      currentStreak: Number(parsed.currentStreak) || 0,
      bestStreak: Number(parsed.bestStreak) || 0
    };
  } catch {
    return { correct: 0, attempted: 0, currentStreak: 0, bestStreak: 0 };
  }
}

function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
