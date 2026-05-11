import questionBank, { MAIN_CATEGORIES } from "./data/questions.js";

const TEST_SIZE = 8;
const TEST_CATALOG = buildTestCatalog(questionBank);

const bankCount = document.getElementById("bankCount");
const modeName = document.getElementById("modeName");
const scoreEl = document.getElementById("score");
const attemptedEl = document.getElementById("attempted");
const accuracyEl = document.getElementById("accuracy");
const bestStreakEl = document.getElementById("bestStreak");
const timerEl = document.getElementById("timer");
const categoryFilter = document.getElementById("categoryFilter");
const testPackSelect = document.getElementById("testPackSelect");
const startStrategy = document.getElementById("startStrategy");
const practiceTrack = document.getElementById("practiceTrack");
const startBtn = document.getElementById("startBtn");
const testStatus = document.getElementById("testStatus");
const modeCards = Array.from(document.querySelectorAll("[data-pick-mode]"));

const quizStage = document.getElementById("quizStage");
const qIndex = document.getElementById("qIndex");
const qModeTag = document.getElementById("qModeTag");
const qPrompt = document.getElementById("qPrompt");
const qInstruction = document.getElementById("qInstruction");
const answerForm = document.getElementById("answerForm");
const choiceWrap = document.getElementById("choiceWrap");
const textAnswerWrap = document.getElementById("textAnswerWrap");
const textAnswerLabel = document.getElementById("textAnswerLabel");
const textAnswerInput = document.getElementById("textAnswerInput");
const revealBtn = document.getElementById("revealBtn");
const nextBtn = document.getElementById("nextBtn");
const feedback = document.getElementById("feedback");
const flashActions = document.getElementById("flashActions");
const knewBtn = document.getElementById("knewBtn");
const reviewBtn = document.getElementById("reviewBtn");
const answerSheet = document.getElementById("answerSheet");
const sheetSummary = document.getElementById("sheetSummary");
const sheetList = document.getElementById("sheetList");
const nextTestBtn = document.getElementById("nextTestBtn");
const retakeTestBtn = document.getElementById("retakeTestBtn");

const STORAGE_KEY = "samas_sprint_progress_v6";

const MODE_LABELS = {
  classic: "Classic Drill",
  mcq: "MCQ Challenge",
  speed: "Speed Round",
  flash: "Flash Reveal"
};

const TRACK_LABELS = {
  full: "Full Pair",
  byas_only: "Only ব্যাসবাক্য",
  samas_only: "Only সমাস নির্ণয়"
};

const CATEGORY_EXPLANATIONS = {
  তৎপুরুষ: "ব্যাসবাক্যে পূর্বপদ ও পরপদের মধ্যে বিভক্তির সম্পর্ক থাকে, তাই এটি তৎপুরুষ।",
  কর্মধারয়: "একই পদার্থকে বিশেষণ-বিশেষ্যভাবে প্রকাশ করে, তাই এটি কর্মধারয়।",
  বহুব্রীহি: "সমস্তপদটি সাধারণত অন্য কিছুকে বোঝায় (যার/যাদের অর্থে), তাই এটি বহুব্রীহি।",
  দ্বন্দ্ব: "দুই বা ততোধিক পদ সমান গুরুত্বে যুক্ত হয়, তাই এটি দ্বন্দ্ব।",
  দ্বিগু: "সংখ্যাবাচক পূর্বপদ দিয়ে সমাহার বোঝায়, তাই এটি দ্বিগু।",
  অব্যয়ীভাব: "অব্যয়/উপসর্গজাত অর্থে সম্পূর্ণ পদটি ক্রিয়া বা অবস্থার ভাব প্রকাশ করে, তাই এটি অব্যয়ীভাব।",
  নিত্য: "পদটি প্রথাগতভাবে বিশেষ অর্থে স্থির হয়ে গেছে, তাই এটি নিত্য সমাস।",
  প্রাদি: "প্র, পরা, আপ ইত্যাদি উপসর্গজাত গঠনে প্রকৃষ্ট বা বিশেষ অর্থ তৈরি করেছে, তাই এটি প্রাদি।"
};

let mode = "classic";
let track = "full";
let activeCategory = "";
let activeTestIndex = 0;
let activeTestName = "";
let activeTestPacks = [];
let queue = [];
let currentIndex = 0;
let activeQuestion = null;
let timerId = null;
let timeLeft = 60;
let questionLocked = false;
let sessionScore = { correct: 0, attempted: 0 };
let sessionRecords = [];
let progress = loadProgress();

init();

function init() {
  bankCount.textContent = String(questionBank.length);
  seedCategoryOptions();

  modeCards.forEach((card) => {
    card.addEventListener("click", () => {
      mode = card.dataset.pickMode;
      modeCards.forEach((item) => item.classList.remove("mode-active"));
      card.classList.add("mode-active");
      practiceTrack.disabled = mode === "mcq";
      track = practiceTrack.disabled ? "samas_only" : practiceTrack.value;
      timerEl.textContent = mode === "speed" ? "60s" : "--";
      updateModeHeader();
      updateTestStatus();
    });
  });

  categoryFilter.addEventListener("change", () => {
    populateTestPackSelect(categoryFilter.value);
    updateTestStatus();
  });

  testPackSelect.addEventListener("change", updateTestStatus);
  startStrategy.addEventListener("change", updateTestStatus);

  practiceTrack.addEventListener("change", () => {
    track = practiceTrack.value;
    updateModeHeader();
  });

  startBtn.addEventListener("click", startSession);
  answerForm.addEventListener("submit", onSubmitAnswer);
  revealBtn.addEventListener("click", onRevealAnswer);
  knewBtn.addEventListener("click", () => onFlashMark(true));
  reviewBtn.addEventListener("click", () => onFlashMark(false));
  nextTestBtn.addEventListener("click", startNextTestFromSheet);
  retakeTestBtn.addEventListener("click", retakeTestFromSheet);

  updateModeHeader();
  updateProgressUi();
}

function seedCategoryOptions() {
  const validCategories = MAIN_CATEGORIES.filter((category) => (TEST_CATALOG[category] || []).length > 0);

  validCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  if (validCategories.length > 0) {
    activeCategory = validCategories[0];
    categoryFilter.value = activeCategory;
    populateTestPackSelect(activeCategory);
    updateTestStatus();
  }
}

function startSession(overrides = {}) {
  clearTimer();
  resetSession();

  const category = overrides.category || categoryFilter.value;
  if (!category || !TEST_CATALOG[category] || TEST_CATALOG[category].length === 0) {
    setFeedback("প্রথমে একটি category বেছে নাও।", "bad");
    feedback.classList.remove("hidden");
    return;
  }

  activeCategory = category;
  categoryFilter.value = category;
  activeTestPacks = TEST_CATALOG[category];
  const categoryState = ensureCategoryState(category, activeTestPacks.length);

  const selectedIndex = Number(testPackSelect.value) || 0;
  const strategy = overrides.strategy || startStrategy.value;

  let pickedIndex;
  if (typeof overrides.forcedIndex === "number") {
    pickedIndex = overrides.forcedIndex;
  } else if (strategy === "resume") {
    pickedIndex = categoryState.resumeIndex;
  } else {
    pickedIndex = selectedIndex;
  }

  pickedIndex = clamp(pickedIndex, 0, activeTestPacks.length - 1);
  activeTestIndex = pickedIndex;
  activeTestName = activeTestPacks[activeTestIndex].name;
  testPackSelect.value = String(activeTestIndex);

  track = mode === "mcq" ? "samas_only" : practiceTrack.value;
  queue = [...activeTestPacks[activeTestIndex].questions];

  if (queue.length === 0) {
    setFeedback("এই test-এ প্রশ্ন পাওয়া যায়নি।", "bad");
    feedback.classList.remove("hidden");
    return;
  }

  if (mode === "speed") {
    timeLeft = 60;
    timerEl.textContent = `${timeLeft}s`;
    timerId = window.setInterval(() => {
      timeLeft -= 1;
      timerEl.textContent = `${timeLeft}s`;
      if (timeLeft <= 0) {
        clearTimer();
        finishSession("সময় শেষ", false);
      }
    }, 1000);
  } else {
    timerEl.textContent = "--";
  }

  updateModeHeader();
  updateTestStatus();
  quizStage.scrollIntoView({ behavior: "smooth", block: "start" });
  renderQuestion();
}

function renderQuestion() {
  if (currentIndex >= queue.length) {
    finishSession("সেট শেষ", true);
    return;
  }

  activeQuestion = queue[currentIndex];
  questionLocked = false;

  qIndex.textContent = `প্রশ্ন ${currentIndex + 1} / ${queue.length}`;
  qModeTag.textContent = `${buildQuestionTag()} | ${activeTestName}`;
  qPrompt.textContent = `সমস্তপদ: ${activeQuestion.word}`;
  feedback.classList.add("hidden");
  feedback.classList.remove("ok", "bad");
  flashActions.classList.add("hidden");
  textAnswerInput.value = "";
  clearChoices();

  answerForm.classList.remove("hidden");
  revealBtn.classList.remove("hidden");

  if (mode === "flash") {
    nextBtn.classList.add("hidden");
    choiceWrap.classList.add("hidden");
    textAnswerWrap.classList.add("hidden");
    qInstruction.textContent = "প্রথমে উত্তর ভাবো, তারপর Reveal Answer চাপো।";
    return;
  }

  nextBtn.classList.remove("hidden");
  renderTrackInputs();
}

function renderTrackInputs() {
  if (mode === "mcq") {
    qInstruction.textContent = "৪টি অপশনের মধ্যে সঠিক সমাসের নাম নির্বাচন করে Next চাপো।";
    choiceWrap.classList.remove("hidden");
    textAnswerWrap.classList.add("hidden");
    renderChoices(true);
    return;
  }

  if (track === "full") {
    qInstruction.textContent = "সমাস নির্ণয় করো এবং ব্যাসবাক্য লিখে Next চাপো।";
    choiceWrap.classList.remove("hidden");
    textAnswerWrap.classList.remove("hidden");
    textAnswerLabel.textContent = "ব্যাসবাক্য লিখো";
    textAnswerInput.placeholder = "উদাহরণ: রাজার পুত্র";
    renderChoices(false);
    return;
  }

  if (track === "byas_only") {
    qInstruction.textContent = "সঠিক ব্যাসবাক্য লিখে Next চাপো।";
    choiceWrap.classList.add("hidden");
    textAnswerWrap.classList.remove("hidden");
    textAnswerLabel.textContent = "ব্যাসবাক্য লিখো";
    textAnswerInput.placeholder = "উদাহরণ: রাজার পুত্র";
    return;
  }

  qInstruction.textContent = "সঠিক সমাসের নাম নির্বাচন করে Next চাপো।";
  choiceWrap.classList.remove("hidden");
  textAnswerWrap.classList.add("hidden");
  renderChoices(false);
}

function renderChoices(isMcq) {
  choiceWrap.innerHTML = "";
  const options = isMcq ? getMcqOptions(activeQuestion.category) : MAIN_CATEGORIES;
  options.forEach((category) => {
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

function getMcqOptions(correctCategory) {
  const otherCategories = MAIN_CATEGORIES.filter((item) => item !== correctCategory);
  const distractors = shuffle([...otherCategories]).slice(0, 3);
  return shuffle([correctCategory, ...distractors]);
}

function onSubmitAnswer(event) {
  event.preventDefault();
  if (!activeQuestion || questionLocked || mode === "flash") {
    return;
  }

  const evaluation = evaluateCurrentAnswer();
  if (!evaluation.valid) {
    setFeedback(evaluation.message, "bad");
    feedback.classList.remove("hidden");
    return;
  }

  questionLocked = true;
  feedback.classList.add("hidden");
  registerResult(evaluation.correct);
  recordSessionAnswer(evaluation.record);
  goNext();
}

function evaluateCurrentAnswer() {
  if (mode === "mcq") {
    return evaluateSamasOnly(true);
  }

  if (track === "full") {
    return evaluateFullTrack();
  }

  if (track === "byas_only") {
    return evaluateByasOnly();
  }

  return evaluateSamasOnly(false);
}

function evaluateFullTrack() {
  const selectedCategory = getCheckedCategory();
  if (!selectedCategory) {
    return { valid: false, message: "একটি সমাসের নাম নির্বাচন করো।" };
  }

  const userByas = textAnswerInput.value.trim();
  if (!userByas) {
    return { valid: false, message: "ব্যাসবাক্য ঘরটি পূরণ করো।" };
  }

  const categoryCorrect = selectedCategory === activeQuestion.category;
  const byasCorrect = isByasCorrect(userByas, activeQuestion.byasabakya);
  const correct = categoryCorrect && byasCorrect;

  return {
    valid: true,
    correct,
    record: {
      correct,
      userCategory: selectedCategory,
      userByas
    }
  };
}

function evaluateByasOnly() {
  const userByas = textAnswerInput.value.trim();
  if (!userByas) {
    return { valid: false, message: "ব্যাসবাক্য লিখে তারপর Next চাপো।" };
  }

  const correct = isByasCorrect(userByas, activeQuestion.byasabakya);
  return {
    valid: true,
    correct,
    record: {
      correct,
      userByas
    }
  };
}

function evaluateSamasOnly(mcqMode) {
  const selectedCategory = getCheckedCategory();
  if (!selectedCategory) {
    return { valid: false, message: "একটি সমাসের নাম নির্বাচন করো।" };
  }

  const correct = selectedCategory === activeQuestion.category;
  return {
    valid: true,
    correct,
    record: {
      correct,
      userCategory: selectedCategory,
      mcq: mcqMode
    }
  };
}

function onRevealAnswer() {
  if (!activeQuestion) {
    return;
  }

  const resultText = [
    "<p><strong>রেফারেন্স উত্তর:</strong></p>",
    `<p><strong>সমাস:</strong> ${activeQuestion.category}</p>`,
    `<p><strong>ব্যাসবাক্য:</strong> ${activeQuestion.byasabakya}</p>`,
    `<p><strong>ব্যাখ্যা:</strong> ${buildExplanation(activeQuestion)}</p>`
  ].join("");

  setFeedback(resultText, "ok");
  feedback.classList.remove("hidden");

  if (mode === "flash") {
    flashActions.classList.remove("hidden");
  }
}

function onFlashMark(correct) {
  if (!activeQuestion || questionLocked) {
    return;
  }

  questionLocked = true;
  registerResult(correct);
  recordSessionAnswer({
    correct,
    userCategory: correct ? "Self-marked: knew this" : "Self-marked: need review",
    byFlashMode: true
  });
  goNext();
}

function goNext() {
  currentIndex += 1;
  renderQuestion();
}

function finishSession(reason, completedAll) {
  clearTimer();
  activeQuestion = null;
  answerForm.classList.add("hidden");
  flashActions.classList.add("hidden");

  updateCategoryProgress(completedAll);

  qIndex.textContent = "Session Complete";
  qModeTag.textContent = `${buildQuestionTag()} | ${activeTestName}`;
  qPrompt.textContent = `চমৎকার! ${reason}`;
  qInstruction.textContent = "নিচে Answer Sheet দেখো, তারপর Next Test বা Retake বেছে নাও।";

  setFeedback(
    `<p><strong>এই সেশনের ফল:</strong> ${sessionScore.correct} / ${sessionScore.attempted}</p>`,
    "ok"
  );
  feedback.classList.remove("hidden");
  renderAnswerSheet(reason);
  updateTestStatus();
}

function renderAnswerSheet(reason) {
  const sessionAccuracy = sessionScore.attempted > 0
    ? Math.round((sessionScore.correct / sessionScore.attempted) * 100)
    : 0;

  sheetSummary.textContent = `${activeCategory} | ${activeTestName} | ${reason} | Score ${sessionScore.correct}/${sessionScore.attempted} | Accuracy ${sessionAccuracy}%`;

  const recordMap = new Map(sessionRecords.map((item) => [item.questionId, item]));
  sheetList.innerHTML = queue.map((question, index) => {
    const record = recordMap.get(question.id);
    const statusClass = !record ? "unanswered" : (record.correct ? "correct" : "wrong");
    const statusText = !record ? "Not Answered" : (record.correct ? "Correct" : "Wrong");
    const yourAnswer = formatUserAnswer(record);
    const explanation = buildExplanation(question);

    return [
      `<article class="sheet-item ${statusClass}">`,
      `<p><strong>Q${index + 1}.</strong> সমস্তপদ: ${question.word}</p>`,
      `<p><strong>Status:</strong> ${statusText}</p>`,
      `<p><strong>Your Answer:</strong> ${yourAnswer}</p>`,
      `<p><strong>Correct Samas:</strong> ${question.category}</p>`,
      `<p><strong>Correct Byasabakya:</strong> ${question.byasabakya}</p>`,
      `<p><strong>Why This Is Correct:</strong> ${explanation}</p>`,
      "</article>"
    ].join("");
  }).join("");

  const hasNext = activeTestIndex < activeTestPacks.length - 1;
  nextTestBtn.disabled = !hasNext;
  retakeTestBtn.disabled = activeTestPacks.length === 0;

  if (hasNext) {
    nextTestBtn.textContent = `Start Next Test (${activeTestPacks[activeTestIndex + 1].shortName})`;
  } else {
    nextTestBtn.textContent = "No Next Test";
  }
  retakeTestBtn.textContent = `Retake ${activeTestPacks[activeTestIndex].shortName}`;

  answerSheet.classList.remove("hidden");
  answerSheet.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startNextTestFromSheet() {
  if (!activeCategory || activeTestPacks.length === 0) {
    return;
  }
  const nextIndex = activeTestIndex + 1;
  if (nextIndex > activeTestPacks.length - 1) {
    return;
  }
  startSession({
    category: activeCategory,
    strategy: "selected",
    forcedIndex: nextIndex
  });
}

function retakeTestFromSheet() {
  if (!activeCategory || activeTestPacks.length === 0) {
    return;
  }
  startSession({
    category: activeCategory,
    strategy: "selected",
    forcedIndex: activeTestIndex
  });
}

function updateCategoryProgress(completedAll) {
  const state = ensureCategoryState(activeCategory, activeTestPacks.length);
  state.lastPlayedIndex = activeTestIndex;

  if (completedAll) {
    state.lastCompletedIndex = activeTestIndex;
    state.resumeIndex = activeTestIndex < activeTestPacks.length - 1
      ? activeTestIndex + 1
      : activeTestIndex;
  } else {
    state.resumeIndex = activeTestIndex;
  }

  saveProgress(progress);
}

function populateTestPackSelect(category) {
  testPackSelect.innerHTML = "";
  const packs = TEST_CATALOG[category] || [];
  if (packs.length === 0) {
    return;
  }

  const state = ensureCategoryState(category, packs.length);

  packs.forEach((pack, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${pack.shortName} (${pack.questions.length} Q)`;
    testPackSelect.appendChild(option);
  });

  testPackSelect.value = String(state.resumeIndex);
}

function updateTestStatus() {
  const category = categoryFilter.value;
  if (!category || !(TEST_CATALOG[category] || []).length) {
    testStatus.textContent = "Pick a category to see its predefined test roadmap.";
    return;
  }

  const packs = TEST_CATALOG[category];
  const state = ensureCategoryState(category, packs.length);
  const resumePack = packs[state.resumeIndex];
  const lastCompleted = state.lastCompletedIndex >= 0 ? packs[state.lastCompletedIndex] : null;

  testStatus.textContent = [
    `Roadmap: ${packs.length} tests`,
    `Resume: ${resumePack ? resumePack.shortName : "N/A"}`,
    `Last Completed: ${lastCompleted ? lastCompleted.shortName : "None yet"}`
  ].join(" | ");
}

function ensureCategoryState(category, totalTests) {
  if (!progress.categoryState) {
    progress.categoryState = {};
  }
  if (!progress.categoryState[category]) {
    progress.categoryState[category] = {
      resumeIndex: 0,
      lastCompletedIndex: -1,
      lastPlayedIndex: -1
    };
  }

  const state = progress.categoryState[category];
  state.resumeIndex = clamp(state.resumeIndex, 0, Math.max(totalTests - 1, 0));
  state.lastCompletedIndex = clamp(state.lastCompletedIndex, -1, Math.max(totalTests - 1, -1));
  state.lastPlayedIndex = clamp(state.lastPlayedIndex, -1, Math.max(totalTests - 1, -1));
  return state;
}

function recordSessionAnswer(details) {
  const entry = {
    questionId: activeQuestion.id,
    word: activeQuestion.word,
    correctCategory: activeQuestion.category,
    correctByasabakya: activeQuestion.byasabakya,
    correct: Boolean(details.correct),
    userCategory: details.userCategory || "",
    userByas: details.userByas || "",
    byFlashMode: Boolean(details.byFlashMode),
    mcq: Boolean(details.mcq)
  };

  const existingIndex = sessionRecords.findIndex((item) => item.questionId === activeQuestion.id);
  if (existingIndex === -1) {
    sessionRecords.push(entry);
  } else {
    sessionRecords[existingIndex] = entry;
  }
}

function formatUserAnswer(record) {
  if (!record) {
    return "No answer submitted";
  }

  if (record.byFlashMode) {
    return record.userCategory || "Self-marked";
  }

  if (record.userCategory && record.userByas) {
    return `সমাস: ${record.userCategory} | ব্যাসবাক্য: ${escapeHtml(record.userByas)}`;
  }

  if (record.userCategory) {
    return `সমাস: ${record.userCategory}`;
  }

  if (record.userByas) {
    return `ব্যাসবাক্য: ${escapeHtml(record.userByas)}`;
  }

  return "No answer submitted";
}

function buildExplanation(question) {
  const base = CATEGORY_EXPLANATIONS[question.category] || "ব্যাসবাক্য অনুযায়ী পদগঠনের নিয়মে এই সমাস নির্ধারিত হয়।";
  return `${base} (${question.byasabakya})`;
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
  modeName.textContent = buildQuestionTag();
}

function buildQuestionTag() {
  if (mode === "mcq") {
    return `${MODE_LABELS[mode]} • Samas Only`;
  }
  return `${MODE_LABELS[mode]} • ${TRACK_LABELS[track]}`;
}

function getCheckedCategory() {
  const selected = document.querySelector('input[name="categoryChoice"]:checked');
  return selected ? selected.value : "";
}

function clearChoices() {
  choiceWrap.innerHTML = "";
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

function resetSession() {
  queue = [];
  currentIndex = 0;
  activeQuestion = null;
  questionLocked = false;
  sessionScore = { correct: 0, attempted: 0 };
  sessionRecords = [];
  feedback.classList.add("hidden");
  answerSheet.classList.add("hidden");
  sheetList.innerHTML = "";
  sheetSummary.textContent = "Session summary will appear here.";
}

function clearTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function setFeedback(message, type) {
  feedback.innerHTML = message;
  feedback.classList.remove("ok", "bad");
  feedback.classList.add(type === "ok" ? "ok" : "bad");
}

function buildTestCatalog(questions) {
  const catalog = {};

  MAIN_CATEGORIES.forEach((category) => {
    const perCategory = questions
      .filter((item) => item.category === category)
      .sort((a, b) => a.id - b.id);

    const chunks = chunkArray(perCategory, TEST_SIZE);
    catalog[category] = chunks.map((chunk, index) => {
      const number = index + 1;
      const label = String(number).padStart(2, "0");
      const shortName = `Test ${label}`;
      return {
        index,
        shortName,
        name: `${category} Mastery Test ${label}`,
        questions: chunk
      };
    });
  });

  return catalog;
}

function chunkArray(arr, size) {
  const output = [];
  for (let i = 0; i < arr.length; i += size) {
    output.push(arr.slice(i, i + size));
  }
  return output;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        correct: 0,
        attempted: 0,
        currentStreak: 0,
        bestStreak: 0,
        categoryState: {}
      };
    }

    const parsed = JSON.parse(raw);
    return {
      correct: Number(parsed.correct) || 0,
      attempted: Number(parsed.attempted) || 0,
      currentStreak: Number(parsed.currentStreak) || 0,
      bestStreak: Number(parsed.bestStreak) || 0,
      categoryState: parsed.categoryState && typeof parsed.categoryState === "object"
        ? parsed.categoryState
        : {}
    };
  } catch {
    return {
      correct: 0,
      attempted: 0,
      currentStreak: 0,
      bestStreak: 0,
      categoryState: {}
    };
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
