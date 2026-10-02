/**
 * 찰칵찰칵 사진관
 * 흐름: 시작 → 배경 선택 → 실시간 합성 미리보기 + 촬영(타이머 지원) → 저장 (다시 찍기 가능)
 *
 * - 배경 이미지는 아래 PRESETS 배열에서 바꿉니다.
 * - 저장 파일명: chalkstudio_날짜_순번.png (날짜가 바뀌면 순번은 1부터)
 * - index.html / main.css / main.js 는 항상 같은 버전끼리 함께 올려야 합니다.
 */

window.APP_VERSION = "2026-09-28-r5";   // index.html / main.css 와 버전이 같아야 합니다 (아래 점검 참고)


// ---------------------------------------------------------------
// 배경 프리셋 목록
// ---------------------------------------------------------------
const PRESETS = [
  { file: "backgrounds/01_house_in_the_sea.png", label: "바다 속 집" },
  { file: "backgrounds/02_on_the_sky.png", label: "하늘 위 유치원" },
  { file: "backgrounds/03_snack_house.png", label: "과자집" },
];

// ---------------------------------------------------------------
// 화면 안내 음성
// - 화면이 바뀔 때마다 아래 파일을 재생합니다. 파일은 public/audio/ 폴더에 넣으세요.
// - 음성을 넣지 않을 화면은 null 로 두면 됩니다. 파일이 없어도 오류 없이 조용히 넘어갑니다.
// - 파일 형식/권장 사양은 README.md 의 "화면 안내 음성" 참고 (MP3, 2~6초 권장).
// ---------------------------------------------------------------
const VOICES = {
  start: "audio/00_어서오세요_여기는_찰칵찰칵_사진관입니다.m4a",
  background: "audio/01_원하는_배경을_선택해_주세요.m4a",
  capture: [
    "audio/02_사진_찍기_버튼을_눌러주세요.m4a",
    "audio/03_사진이_마음에_들지_않으면_다시_찍기_버튼을_눌러주세요.m4a",   // 촬영 화면: 위 파일 다음에 이어서 재생
  ],
  done: "audio/04_저장하기_버튼을_눌러주세요.m4a",
};
const VOICE_VOLUME = 1.0;   // 0.0(무음) ~ 1.0(최대)

// VOICES의 값은 파일 하나(문자열)여도, 순서대로 이어 재생할 여러 개(배열)여도 됩니다.
const voicePlayers = {};
Object.entries(VOICES).forEach(([name, files]) => {
  if (!files) return;
  const list = Array.isArray(files) ? files : [files];
  voicePlayers[name] = list.map((file) => {
    const audio = new Audio(file);
    audio.preload = "auto";
    audio.volume = VOICE_VOLUME;
    return audio;
  });
});
let currentVoice = null;
let voiceChainName = null;
let voiceChainIndex = 0;

function stopVoice() {
  if (!currentVoice) return;
  currentVoice.onended = null;   // 정지 후에 다음 곡으로 이어지지 않도록
  currentVoice.pause();
  currentVoice.currentTime = 0;
  currentVoice = null;
  voiceChainName = null;
}

function playVoiceStep() {
  const list = voicePlayers[voiceChainName];
  if (!list || voiceChainIndex >= list.length) {
    currentVoice = null;
    return;
  }
  const audio = list[voiceChainIndex];
  audio.currentTime = 0;
  currentVoice = audio;
  audio.onended = () => {
    voiceChainIndex += 1;
    playVoiceStep();   // 목록에 다음 파일이 있으면 이어서 재생
  };
  // 파일이 없거나 브라우저가 재생을 막은 경우에는 조용히 넘어갑니다.
  audio.play().catch(() => {});
}

function playVoice(name) {
  stopVoice();   // 앞 화면의 음성이 아직 나오고 있으면 끊고 새 음성을 재생
  if (!voicePlayers[name]) return;
  voiceChainName = name;
  voiceChainIndex = 0;
  playVoiceStep();
}

// ---------------------------------------------------------------
// 음성 "잠금 해제"
// 브라우저는 "사람이 방금 화면을 눌렀다"는 상태에서만 소리 재생을 허용합니다.
// 촬영 화면처럼 카메라 준비를 기다린 "뒤에" 소리를 재생하려 하면, 그 사이에 이 상태가
// 사라져서 소리가 조용히 막힐 수 있습니다. 그래서 이 페이지에서 사람이 처음 화면을
// 누르는 그 순간, 모든 음성 파일을 아주 짧게(무음으로) 한 번씩 재생해 미리 "허락"을
// 받아둡니다. 이렇게 한 번 허락받은 파일은 이후에는 시간이 아무리 지난 뒤에 재생을
// 시도해도 막히지 않습니다.
// ---------------------------------------------------------------
function unlockVoicesOnce() {
  Object.values(voicePlayers).flat().forEach((audio) => {
    const wasMuted = audio.muted;
    audio.muted = true;
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = wasMuted;
      })
      .catch(() => {
        audio.muted = wasMuted;
      });
  });
}
document.addEventListener("pointerdown", unlockVoicesOnce, { once: true });

// 페이지를 처음 열었을 때 00번(시작 안내) 재생을 시도합니다.
// 브라우저가 아직 아무 터치도 없었다는 이유로 막으면 조용히 넘어가고, 그 경우 사람이
// 화면을 한 번 누른 뒤("촬영 시작하기" 등) 다시 시작 화면으로 돌아왔을 때부터 들립니다.
playVoice("start");

const screens = {
  start: document.getElementById("screen-start"),
  background: document.getElementById("screen-background"),
  capture: document.getElementById("screen-capture"),
  done: document.getElementById("screen-done"),
};

function showScreen(name) {
  Object.values(screens).forEach((el) => el && el.classList.add("hidden"));
  if (!screens[name]) return;   // 화면 요소가 없으면(파일 버전 불일치) 전부 숨겨져 빈 화면이 되는 걸 막습니다
  screens[name].classList.remove("hidden");
  // 현재 화면 이름을 body에 기록해 둡니다 (화면별 스타일/점검용).
  document.body.dataset.screen = name;
  window.scrollTo(0, 0);

  if (name !== "capture") {
    cancelCountdown();
    setTimerPanel(false);
  }
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
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // 1) 배경은 뒤집지 않고 원본 방향 그대로 그립니다.
  drawImageCover(ctx, backgroundImage, w, h);

  // 2) 웹캠 영상에서 사람만 오려냅니다 (마스크 밖은 투명).
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d");

  maskCtx.drawImage(results.segmentationMask, 0, 0, w, h);
  maskCtx.globalCompositeOperation = "source-in";
  maskCtx.drawImage(results.image, 0, 0, w, h);

  // 3) 오려낸 사람만 좌우 반전(거울)해서 배경 위에 얹습니다.
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
// index.html / main.css / main.js 가 서로 다른 버전이면 화면 위에 빨간 안내를 띄웁니다.
// (GitHub에 일부 파일만 올리거나, 다른 폴더의 같은 이름 파일을 섞었을 때 원인을 바로 알 수 있게)
// ---------------------------------------------------------------
window.addEventListener("load", () => {
  const html = document.querySelector('meta[name="app-version"]')?.content || "옛 버전";
  const css = getComputedStyle(document.documentElement).getPropertyValue("--app-version").replace(/["'\s]/g, "") || "옛 버전";
  const js = window.APP_VERSION;
  const requiredIds = [
    "screen-start", "screen-background", "screen-capture", "screen-done", "preset-grid",
    "btn-start", "btn-back-to-start", "btn-confirm-bg", "btn-change-bg", "webcam", "composite",
    "countdown", "btn-timer", "timer-panel", "timer-chips", "btn-shutter",
    "result-photo", "btn-download", "btn-retake", "btn-restart",
  ];
  const missing = requiredIds.filter((id) => !document.getElementById(id));
  if (html === js && css === js && missing.length === 0) return;

  const banner = document.createElement("div");
  banner.className = "version-banner";
  banner.textContent =
    `파일 버전이 서로 맞지 않아요 (index.html: ${html} / main.css: ${css} / main.js: ${js}). ` +
    "세 파일을 같은 폴더의 최신 파일로 모두 덮어써 주세요. 그래도 그대로면 Ctrl+F5로 새로고침하세요.";
  document.body.insertBefore(banner, document.body.firstChild);
});
