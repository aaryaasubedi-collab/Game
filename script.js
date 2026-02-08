/*
  Beginner-friendly Valentine's quiz game.
  New flow:
  1) Answer a question.
  2) Go to movement screen and watch avatars move.
  3) Correct -> next question. Wrong -> repeat same question.
*/

// ---------- 1) Grab page elements ----------
const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const moveScreen = document.getElementById("move-screen");
const envelopeScreen = document.getElementById("envelope-screen");
const noScreen = document.getElementById("no-screen");
const finalScreen = document.getElementById("final-screen");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const moveNextBtn = document.getElementById("move-next-btn");
const restartBtn = document.getElementById("restart-btn");
const openEnvelopeBtn = document.getElementById("open-envelope-btn");
const toFinalBtn = document.getElementById("to-final-btn");
const envelopeYesBtn = document.getElementById("envelope-yes-btn");
const envelopeNoBtn = document.getElementById("envelope-no-btn");
const cryPromptText = document.getElementById("cry-prompt-text");
const cryActions = document.getElementById("cry-actions");
const cryYesBtn = document.getElementById("cry-yes-btn");
const cryNoBtn = document.getElementById("cry-no-btn");

const questionCount = document.getElementById("question-count");
const scoreText = document.getElementById("score-text");
const questionText = document.getElementById("question-text");
const answersEl = document.getElementById("answers");
const progressBar = document.getElementById("progress-bar");
const finalScore = document.getElementById("final-score");
const moveMessage = document.getElementById("move-message");
const moveResultText = document.getElementById("move-result-text");
const envelopeBox = document.getElementById("envelope-box");
const envelopeResponse = document.getElementById("envelope-response");

const gfMarker = document.getElementById("gf-marker");
const meMarker = document.getElementById("me-marker");
const labelConnecticut = document.getElementById("label-connecticut");
const labelNepal = document.getElementById("label-nepal");
const labelAlaska = document.getElementById("label-alaska");

// ---------- 2) Quiz data ----------
const questions = [
  {
    question: "Which year did we first talk?",
    answers: ["2014",  "2024", "2015", "2025"],
    correctIndex: 2
  },
  {
    question: "When did we have our first date?",
    answers: ["Sep 15", "Sep 16", "Sep 17", "Sep 18"],
    correctIndex: 1
  },
  {
    question: "Which is the first book I ever gifted you?",
    answers: ["One Flew Over the Cuckoo's Nest", "The Island of Missing Trees", "20 Love Poems and a Song of Despair", "Rebecca", "Drunk on Love"],
    correctIndex: 0
  },
  {
    question: "What is the first flower you gave me?",
    answers: ["Rose", "Marigold", "Sunflower", "Bougainvillea", "Daisy"],
    correctIndex: 3
  },
  {
    question: "What is my most favourite nickname?",
    answers: ["Sunflower", "Babyboo", "CutiPie", "KanchuPie", "Babe"],
    correctIndex: 3
  },
  {
    question: "What is my most favourite activity nowadays?",
    answers: ["Teaching", "Studying",
       "Baking", 
       "Reading", 
       "Spending time with you"],
    correctIndex: 4
  }
];

// ---------- 3) Map coordinates ----------
const places = {
  connecticut: { lat: 21.6032, lon: -73.0877 },
  nepal: { lat: -60.3949, lon: 84.124 },
  alaska: { lat: 34.2008, lon: -149.4937 }
};

let gfPosition = { ...places.connecticut };
let mePosition = { ...places.nepal };
const meetPoint = {
  lat: (places.connecticut.lat + places.nepal.lat) / 2,
  lon: (places.connecticut.lon + places.nepal.lon) / 2
};
const noPathTargets = {
  her: { ...places.alaska },
  me: { lat: -26.5, lon: 153.5 } // near eastern border of Australia
};

// ---------- 4) Game state ----------
let currentQuestionIndex = 0;
let solvedQuestions = 0;
let selectedAnswerIndex = null;
let pendingIsCorrect = false;
let savedGfPosition = null;
let savedMePosition = null;

const userAnswers = [];

// ---------- 5) Utility helpers ----------
function showScreen(screenToShow) {
  [startScreen, quizScreen, moveScreen, envelopeScreen, noScreen, finalScreen].forEach((screen) => {
    screen.classList.remove("active");
  });
  screenToShow.classList.add("active");

  // While showing map-action overlays, hide the top tracker card.
  const isMapOverlay = screenToShow === moveScreen || screenToShow === noScreen;
  document.body.classList.toggle("move-mode", isMapOverlay);
}

function setReunionMode(isOn) {
  document.body.classList.toggle("reunion-mode", isOn);
}

function setHeartLayerVisible(isOn) {
  document.body.classList.toggle("show-hearts", isOn);
}

function setCryMode(isOn) {
  document.body.classList.toggle("cry-mode", isOn);
}

function latLonToPercent(lat, lon) {
  const x = ((lon + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return { x, y };
}

function setMarkerFromLatLon(element, lat, lon) {
  if (!element) return;
  const point = latLonToPercent(lat, lon);
  element.style.left = `${point.x}%`;
  element.style.top = `${point.y}%`;
}

function drawMarkers() {
  setMarkerFromLatLon(gfMarker, gfPosition.lat, gfPosition.lon);
  setMarkerFromLatLon(meMarker, mePosition.lat, mePosition.lon);
}

function setPlaceLabels() {
  setMarkerFromLatLon(labelConnecticut, places.connecticut.lat, places.connecticut.lon);
  setMarkerFromLatLon(labelNepal, places.nepal.lat, places.nepal.lon);
  setMarkerFromLatLon(labelAlaska, places.alaska.lat, places.alaska.lon);
}

function moveToward(fromPoint, toPoint, ratio) {
  return {
    lat: fromPoint.lat + (toPoint.lat - fromPoint.lat) * ratio,
    lon: fromPoint.lon + (toPoint.lon - fromPoint.lon) * ratio
  };
}

function normalizeLongitude(lon) {
  if (lon > 180) return lon - 360;
  if (lon < -180) return lon + 360;
  return lon;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutBounce(t) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    const p = t - 1.5 / d1;
    return n1 * p * p + 0.75;
  }
  if (t < 2.5 / d1) {
    const p = t - 2.25 / d1;
    return n1 * p * p + 0.9375;
  }
  const p = t - 2.625 / d1;
  return n1 * p * p + 0.984375;
}

// Step progression tuned so question 6 is visibly closer than question 5.
function progressForSolved(solved, total) {
  if (solved >= total) return 1;
  return (solved / total) * 0.9; // question 5 ends at 0.75, question 6 jumps to 1.0
}

// Smooth marker movement shown on the separate movement screen.
function animateMovement(startGf, endGf, startMe, endMe, durationMs, easingFn = null) {
  return new Promise((resolve) => {
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const linearT = Math.min(elapsed / durationMs, 1);
      const t = easingFn ? easingFn(linearT) : linearT;

      gfPosition = {
        lat: lerp(startGf.lat, endGf.lat, t),
        lon: lerp(startGf.lon, endGf.lon, t)
      };

      mePosition = {
        lat: lerp(startMe.lat, endMe.lat, t),
        lon: lerp(startMe.lon, endMe.lon, t)
      };

      drawMarkers();

      if (linearT < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

// ---------- 6) Quiz flow ----------
startBtn.addEventListener("click", () => {
  resetQuiz();
  showScreen(quizScreen);
  renderQuestion();
});

function renderQuestion() {
  const currentQuestion = questions[currentQuestionIndex];

  questionCount.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
  scoreText.textContent = `Solved: ${solvedQuestions}/${questions.length}`;
  questionText.textContent = currentQuestion.question;

  const progressPercent = (currentQuestionIndex / questions.length) * 100;
  progressBar.style.width = `${progressPercent}%`;

  answersEl.innerHTML = "";
  nextBtn.disabled = true;
  selectedAnswerIndex = null;

  currentQuestion.answers.forEach((answerText, answerIndex) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = answerText;

    btn.addEventListener("click", () => {
      selectAnswer(answerIndex);
    });

    answersEl.appendChild(btn);
  });
}

function selectAnswer(answerIndex) {
  const buttons = document.querySelectorAll(".answer-btn");

  buttons.forEach((button) => {
    button.classList.remove("selected");
  });

  buttons[answerIndex].classList.add("selected");
  selectedAnswerIndex = answerIndex;
  nextBtn.disabled = false;
}

nextBtn.addEventListener("click", async () => {
  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = selectedAnswerIndex === currentQuestion.correctIndex;
  pendingIsCorrect = isCorrect;

  userAnswers.push({
    question: currentQuestion.question,
    selectedAnswer: currentQuestion.answers[selectedAnswerIndex],
    isCorrect
  });

  const startGf = { ...gfPosition };
  const startMe = { ...mePosition };
  let endGf;
  let endMe;

  if (isCorrect) {
    solvedQuestions += 1;

    // Each solved question gives one full step toward the midpoint.
    // This means they always meet in the middle after 6 solved questions,
    // even if some questions needed retries.
    const progress = progressForSolved(solvedQuestions, questions.length);
    endGf = moveToward(places.connecticut, meetPoint, progress);
    endMe = moveToward(places.nepal, meetPoint, progress);

    if (solvedQuestions === questions.length) {
      setReunionMode(true);
      setHeartLayerVisible(true);

      // Final meetup positions: very close, but not overlapping.
      // We keep both near midpoint and apply a visual x-offset in CSS.
      endGf = { ...meetPoint };
      endMe = { ...meetPoint };

      moveResultText.textContent = "We beat the distance!";
      moveMessage.textContent = "You both met in the middle!";
    } else {
      moveResultText.textContent = "We're geting closer !!!";
      moveMessage.textContent = "Pls get it right again. I miss u.";
    }
  } else {
    endGf = moveToward(gfPosition, places.alaska, 0.26);
    endMe = { ...mePosition, lon: normalizeLongitude(mePosition.lon + 22) };

    moveResultText.textContent = "NOOOOOOO, wrong answer, we're drifting apart!!";
    moveMessage.textContent = "We drifted apart. You HAVE to get it right now >.<";
  }

  moveNextBtn.disabled = true;
  showScreen(moveScreen);

  // Animate movement on the separate screen.
  gfMarker.classList.add("is-moving");
  meMarker.classList.add("is-moving");

  try {
    await animateMovement(startGf, endGf, startMe, endMe, 1100);
  } finally {
    gfMarker.classList.remove("is-moving");
    meMarker.classList.remove("is-moving");
  }

  // Save final positions after animation.
  gfPosition = endGf;
  mePosition = endMe;
  drawMarkers();

  // Decide what the button should do next.
  if (pendingIsCorrect) {
    if (currentQuestionIndex === questions.length - 1) {
      moveNextBtn.textContent = "What comes next?";
    } else {
      moveNextBtn.textContent = "Next Question";
    }
  } else {
    moveNextBtn.textContent = "Try This Question Again";
  }

  moveNextBtn.disabled = false;
});

// This button is on the separate movement screen.
  moveNextBtn.addEventListener("click", () => {
  if (pendingIsCorrect) {
    currentQuestionIndex += 1;
  }

  if (currentQuestionIndex < questions.length) {
    setHeartLayerVisible(false);
    showScreen(quizScreen);
    renderQuestion();
  } else {
    showEnvelopeScreen();
  }
});

function showEnvelopeScreen() {
  showScreen(envelopeScreen);
  setHeartLayerVisible(false);
  setCryMode(false);
}

function showFinalScreen() {
  showScreen(finalScreen);
  progressBar.style.width = "100%";
  const retryCount = userAnswers.filter((item) => !item.isCorrect).length;
  finalScore.textContent = `Solved all ${questions.length} questions. Retries used: ${retryCount}.`;

  console.log("User Answers:", userAnswers);
  console.log("Final Marker Positions:", { gfPosition, mePosition });
}

openEnvelopeBtn.addEventListener("click", () => {
  envelopeBox.classList.add("open");
  openEnvelopeBtn.disabled = true;
  toFinalBtn.disabled = true;
});

envelopeYesBtn.addEventListener("click", () => {
  envelopeResponse.textContent = "You have no idea how happy I am right now!";
  toFinalBtn.disabled = false;
});

envelopeNoBtn.addEventListener("click", async () => {
  // Save reunion position so we can return if she says "No" to making you cry forever.
  savedGfPosition = { ...gfPosition };
  savedMePosition = { ...mePosition };

  setHeartLayerVisible(false);
  setCryMode(true);
  showNoScreenPrompt();

  const startGf = { ...gfPosition };
  const startMe = { ...mePosition };
  const endGf = { ...noPathTargets.her };
  const endMe = { ...noPathTargets.me };

  gfMarker.classList.add("is-moving");
  meMarker.classList.add("is-moving");
  try {
    await animateMovement(startGf, endGf, startMe, endMe, 1900, easeOutBounce);
  } finally {
    gfMarker.classList.remove("is-moving");
    meMarker.classList.remove("is-moving");
  }

  gfPosition = endGf;
  mePosition = endMe;
  drawMarkers();
});

toFinalBtn.addEventListener("click", () => {
  showFinalScreen();
});

function showNoScreenPrompt() {
  cryPromptText.textContent = "Did my feelings miss the mark?";
  cryActions.style.display = "flex";
  showScreen(noScreen);
}

cryYesBtn.addEventListener("click", () => {
  cryPromptText.textContent = "Going to my corner to cry. Bye. :'(";
  cryActions.style.display = "none";
});

cryNoBtn.addEventListener("click", () => {
  // Return to the valentine question page.
  setCryMode(false);
  if (savedGfPosition && savedMePosition) {
    gfPosition = { ...savedGfPosition };
    mePosition = { ...savedMePosition };
    drawMarkers();
  }
  showEnvelopeScreen();
});

restartBtn.addEventListener("click", () => {
  resetQuiz();
  showScreen(startScreen);
});

function resetQuiz() {
  currentQuestionIndex = 0;
  solvedQuestions = 0;
  selectedAnswerIndex = null;
  pendingIsCorrect = false;
  userAnswers.length = 0;

  moveMessage.textContent = "(depends on whether you are a winner)";
  moveResultText.textContent = "Watch the avatars move...";
  envelopeBox.classList.remove("open");
  openEnvelopeBtn.disabled = false;
  toFinalBtn.disabled = true;
  envelopeResponse.textContent = "";
  cryPromptText.textContent = "Do you want to make Apurva cry forever?";
  cryActions.style.display = "flex";
  savedGfPosition = null;
  savedMePosition = null;
  setReunionMode(false);
  setHeartLayerVisible(false);
  setCryMode(false);

  gfPosition = { ...places.connecticut };
  mePosition = { ...places.nepal };

  progressBar.style.width = "0%";
  drawMarkers();
}

// ---------- 7) Initial setup ----------
setPlaceLabels();
drawMarkers();
