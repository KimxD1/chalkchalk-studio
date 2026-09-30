/**
 * 찰칵찰칵 사진관
 * 흐름: 시작 → 배경 선택 → 실시간 합성 미리보기 + 촬영(타이머 지원) → 저장
 */

// HTML/CSS 버전 정보와 일치
window.APP_VERSION = "2026-09-28-r5";

// ---------------------------------------------------------------
// 배경 프리셋 목록
// ---------------------------------------------------------------
const PRESETS = [
  { file: "backgrounds/01_house_in_the_sea.png", label: "바다 속 집" },
  { file: "backgrounds/02_on_the_sky.png", label: "하늘 위 유치원" },
  { file: "backgrounds/03_snack_house.png", label: "과자집" },
];

// ---------------------------------------------------------------
// 화면 안내 음성 목록
// ---------------------------------------------------------------
const VOICES = {
  start: null,
  background: "audio/01_원하는_배경을_선택해_주세요.m4a",
  capture: [
    "audio/02_사진_찍기_버튼을_눌러주세요.m4a",
    "audio/03_사진이_마음에_들지_않으면_다시_찍기_버튼을_눌러주세요.m4a",
  ],
  done: "audio/04_저장하기_버튼을_눌러주세요.m4a",
};

// ---------------------------------------------------------------
// 오디오 제어 시스템 (순차 재생 async/await 완전 보장)
// ---------------------------------------------------------------
let currentAudio = null;
let currentPlayId = 0; // 중복 및 캔슬 방지용 ID
let isAudioUnlocked = false;

// 첫 클릭/터치 시 브라우저 오디오 언락
function unlockAudio() {
  if (isAudioUnlocked) return;
  
  const dummy = new Audio();
  dummy.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAA=";
  dummy.play().then(() => {
    isAudioUnlocked = true;
    console.log("🔊 오디오 재생 권한이 활성화되었습니다.");
  }).catch((err) => {
    console.warn("🔊 오디오 활성화 대기 중:", err);
  });
}

document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("click", unlockAudio, { once: true });

function stopVoice() {
  currentPlayId++; // 기존 재생 시퀀스 취소
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }
}

// 개별 오디오 파일을 Promise 기반으로 안전 재생
function playSingleAudio(src, playId) {
  return new Promise((resolve) => {
    if (playId !== currentPlayId) {
      resolve(false);
      return;
    }

    const audio = new Audio(src);
    audio.volume = 1.0;
    currentAudio = audio;

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      if (currentAudio === audio) currentAudio = null;
    };

    audio.onended = () => {
      cleanup();
      resolve(true);
    };

    audio.onerror = (e) => {
      console.error(`❌ 음성 파일 로드 실패 (파일 경로/이름 확인): ${src}`, e);
      cleanup();
      resolve(false); // 실패하더라도 다음 오디오로 넘어가도록 처리
    };

    const p = audio.play();
    if (p !== undefined) {
      p.catch((err) => {
        console.warn(`⚠️ 브라우저에 의해 재생 차단됨: ${src}`, err);
        cleanup();
        resolve(false);
      });
    }
  });
}

// 여러 음성 파일(02번 -> 03번)을 순서대로 완결 재생
async function playVoiceSequence(sources) {
  stopVoice();
  const thisPlayId = currentPlayId;

  for (const src of sources) {
    if (thisPlayId !== currentPlayId) break; // 도중에 멈춤 요청 시 중단
    await playSingleAudio(src, thisPlayId);
  }
}

function playVoice(name) {
  const target = VOICES[name];
  if (!target) {
    stopVoice();
    return;
  }

  const list = Array.isArray(target) ? target : [target];
  playVoiceSequence(list);
}

// ---------------------------------------------------------------
// 화면 전환
// ---------------------------------------------------------------
const screens = {
  start: document.getElementById("screen-start"),
  background: document.getElementById("screen-background"),
  capture: document.getElementById("screen-capture"),
  done: document.getElementById("screen-done"),
};

function showScreen(name) {
  Object.values(screens).forEach((el) => {
    if (el) el.classList.add("hidden");
  });

  if (!screens[name]) return;

  screens[name].classList.remove("hidden");
  document.body.dataset.screen = name;
  window.scrollTo(0, 0);

  if (name !== "capture") {
    cancelCountdown();
    setTimerPanel(false);
  }

  // 화면 전환 시 음성 재생
  playVoice(name);
}

// ---------------------------------------------------------------
// 배경 프리셋 선택 UI
// ---------------------------------------------------------------
let selectedBg = null;
const presetGrid = document.getElementById("preset-grid");

PRESETS.forEach((preset) => {
  const card = document.createElement("div");
  card.className = "preset-card";
  card.dataset.bg = preset.file;

  card.innerHTML = `
    <img src="${preset.file}" alt="${preset.label}" />
    <span>${preset.label}</span>
  `;

  card.addEventListener("click", () => {
    document.querySelectorAll(".preset-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedBg = preset.file;
    document.getElementById("btn-confirm-bg").disabled = false;
  });

  presetGrid.appendChild(card);
});

// 시작 버튼
document.getElementById("btn-start").addEventListener("click", () => {
  unlockAudio();
  showScreen("background");
});

// 처음으로 버튼
document.getElementById("btn-back-to-start").addEventListener("click", () => {
  showScreen("start");
});

// 촬영 화면 열기
async function openCapture() {
  try {
    showScreen("capture");
    await startCamera(selectedBg);
  } catch (err) {
    console.error(err);
    stopCamera();
    showScreen("background");
    alert("카메라를 켜지 못했어요. 카메라 권한을 확인해 주세요.");
  }
}

// 배경 확정 버튼
document.getElementById("btn-confirm-bg").addEventListener("click", () => {
  if (!selectedBg) return;
  openCapture();
});

// 배경 다시 고르기
document.getElementById("btn-change-bg").addEventListener("click", () => {
  stopCamera();
  showScreen("background");
});

// ---------------------------------------------------------------
// 웹캠 + MediaPipe 실시간 합성
// ---------------------------------------------------------------
const video = document.getElementById("webcam");
const canvas = document.getElementById("composite");
const ctx = canvas.getContext("2d");

let segmentation = null;
let backgroundImage = null;
let rafId = null;
let stream = null;
let frozenFrame = null;
let loopGen = 0;

async function startCamera(bgUrl) {
  backgroundImage = await loadImage(bgUrl);

  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      aspectRatio: { ideal: 16 / 9 }
    },
    audio: false
  });

  video.srcObject = stream;
  await video.play();

  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;

  if (!segmentation) {
    segmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    segmentation.setOptions({ modelSelection: 1 });
    segmentation.onResults(onSegmentationResult);
  }

  const gen = ++loopGen;
  frozenFrame = null;
  renderLoop(gen);
}

function stopCamera() {
  loopGen++;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (video) {
    video.srcObject = null;
  }
}

function renderLoop(gen) {
  if (gen !== loopGen || frozenFrame) return;

  segmentation.send({ image: video })
    .then(() => {
      if (gen === loopGen) {
        rafId = requestAnimationFrame(() => renderLoop(gen));
      }
    })
    .catch(() => {});
}

function onSegmentationResult(results) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  drawImageCover(ctx, backgroundImage, w, h);

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d");

  maskCtx.drawImage(results.segmentationMask, 0, 0, w, h);
  maskCtx.globalCompositeOperation = "source-in";
  maskCtx.drawImage(results.image, 0, 0, w, h);

  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.restore();
}

function drawImageCover(context, img, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;

  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  context.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ---------------------------------------------------------------
// 타이머 및 촬영 제어
// ---------------------------------------------------------------
const TIMER_KEY = "chalkchalk_timer_seconds";
const TIMER_MAX = 60;

let timerSeconds = loadTimerSeconds();
let countdownId = null;

const shutterBtn = document.getElementById("btn-shutter");
const countdownEl = document.getElementById("countdown");
const timerBtn = document.getElementById("btn-timer");
const timerPanel = document.getElementById("timer-panel");

function loadTimerSeconds() {
  try {
    const v = parseInt(localStorage.getItem(TIMER_KEY), 10);
    if (Number.isFinite(v) && v >= 0 && v <= TIMER_MAX) return v;
  } catch {}
  return 3;
}

function setTimerSeconds(sec) {
  timerSeconds = Math.min(TIMER_MAX, Math.max(0, sec));
  try {
    localStorage.setItem(TIMER_KEY, String(timerSeconds));
  } catch {}
  renderTimerUI();
}

function renderTimerUI() {
  const text = timerSeconds === 0 ? "끔" : `${timerSeconds}초`;
  document.getElementById("timer-label").textContent = text;
  document.getElementById("timer-value").textContent = text;

  document.querySelectorAll("#timer-chips .chip").forEach((chip) => {
    chip.classList.toggle("selected", Number(chip.dataset.sec) === timerSeconds);
  });

  document.getElementById("timer-minus").disabled = timerSeconds <= 0;
  document.getElementById("timer-plus").disabled = timerSeconds >= TIMER_MAX;
}

function setTimerPanel(open) {
  timerPanel.classList.toggle("hidden", !open);
  timerBtn.setAttribute("aria-expanded", String(open));
}

timerBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  setTimerPanel(timerPanel.classList.contains("hidden"));
});

timerPanel.addEventListener("click", (e) => e.stopPropagation());
document.addEventListener("click", () => setTimerPanel(false));

document.querySelectorAll("#timer-chips .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    setTimerSeconds(Number(chip.dataset.sec));
    setTimerPanel(false);
  });
});

document.getElementById("timer-minus").addEventListener("click", () => setTimerSeconds(timerSeconds - 1));
document.getElementById("timer-plus").addEventListener("click", () => setTimerSeconds(timerSeconds + 1));

renderTimerUI();

function showCountdownNumber(n) {
  countdownEl.classList.remove("hidden");
  countdownEl.innerHTML = `<span>${n}</span>`;
}

function cancelCountdown() {
  if (countdownId === null) return;
  clearInterval(countdownId);
  countdownId = null;
  countdownEl.classList.add("hidden");
  countdownEl.innerHTML = "";
  shutterBtn.classList.remove("counting");
  shutterBtn.setAttribute("aria-label", "촬영하기");
  timerBtn.disabled = false;
}

shutterBtn.addEventListener("click", () => {
  stopVoice();

  if (countdownId !== null) {
    cancelCountdown();
    return;
  }

  if (timerSeconds <= 0) {
    takePhoto();
    return;
  }

  setTimerPanel(false);
  let remain = timerSeconds;

  showCountdownNumber(remain);
  shutterBtn.classList.add("counting");
  shutterBtn.setAttribute("aria-label", "촬영 취소");
  timerBtn.disabled = true;

  countdownId = setInterval(() => {
    remain -= 1;
    if (remain <= 0) {
      cancelCountdown();
      takePhoto();
    } else {
      showCountdownNumber(remain);
    }
  }, 1000);
});

function takePhoto() {
  frozenFrame = canvas.toDataURL("image/png");
  stopCamera();
  document.getElementById("result-photo").src = frozenFrame;
  showScreen("done");
}

function getNextPhotoFilename() {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const key = "chalkchalk_photo_counter";
  let stored;

  try { stored = JSON.parse(localStorage.getItem(key) || "{}"); } catch { stored = {}; }

  if (stored.date !== dateStr) stored = { date: dateStr, count: 0 };
  stored.count += 1;

  try { localStorage.setItem(key, JSON.stringify(stored)); } catch {}

  return `chalkstudio_${dateStr}_${stored.count}`;
}

document.getElementById("btn-download").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = frozenFrame;
  a.download = `${getNextPhotoFilename()}.png`;
  a.click();
});

document.getElementById("btn-retake").addEventListener("click", () => {
  if (!selectedBg) return;
  openCapture();
});

document.getElementById("btn-restart").addEventListener("click", () => {
  selectedBg = null;
  document.querySelectorAll(".preset-card").forEach((c) => c.classList.remove("selected"));
  document.getElementById("btn-confirm-bg").disabled = true;
  frozenFrame = null;
  showScreen("start");
});

// ---------------------------------------------------------------
// 파일 버전 점검
// ---------------------------------------------------------------
window.addEventListener("load", () => {
  const html = document.querySelector('meta[name="app-version"]')?.content || "옛 버전";
  const css = getComputedStyle(document.documentElement).getPropertyValue("--app-version").replace(/["'\s]/g, "") || "옛 버전";
  const js = window.APP_VERSION;

  const requiredIds = [
    "screen-start", "screen-background", "screen-capture", "screen-done",
    "preset-grid", "btn-start", "btn-back-to-start", "btn-confirm-bg",
    "btn-change-bg", "webcam", "composite", "countdown", "btn-timer",
    "timer-panel", "timer-chips", "btn-shutter", "result-photo",
    "btn-download", "btn-retake", "btn-restart",
  ];

  const missing = requiredIds.filter((id) => !document.getElementById(id));

  if (html === js && css === js && missing.length === 0) {
    return;
  }

  const banner = document.createElement("div");
  banner.className = "version-banner";
  banner.textContent =
    `파일 버전이 서로 맞지 않아요 (index.html: ${html} / main.css: ${css} / main.js: ${js}). ` +
    "세 파일을 같은 폴더의 최신 파일로 모두 덮어써 주세요. 그래도 그대로면 Ctrl+F5로 새로고침하세요.";

  document.body.insertBefore(banner, document.body.firstChild);
});
