/**
 * 찰칵찰칵 사진관 - 메인(PC/전자칠판) 페이지
 * 흐름: 시작 → 배경 프리셋 선택 → 실시간 합성 미리보기+촬영
 *       → 결제 요청(태블릿에 자동 통지) → 완료(저장)
 */

const API_BASE = "";

// ---------------------------------------------------------------
// 배경 프리셋 목록 - 실제 배경 이미지로 바꿀 때는 이 배열만 수정하면 됩니다.
// file: public/backgrounds/ 폴더 안의 파일 경로, label: 카드에 표시될 이름
// (투명도 불필요 - 화면 전체를 채우는 일반 배경 이미지면 됩니다. 자세한 건
//  README.md의 "배경 이미지 교체 방법" 참고)
// ---------------------------------------------------------------
const PRESETS = [
  { file: "backgrounds/01_house_in_the_sea.png", label: "바다 속 집" },
  { file: "backgrounds/02_on_the_sky.png", label: "하늘 위 유치원" },
  { file: "backgrounds/03_snack_house.png", label: "과자집" },
];

const screens = {
  start: document.getElementById("screen-start"),
  background: document.getElementById("screen-background"),
  capture: document.getElementById("screen-capture"),
  done: document.getElementById("screen-done"),
};

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

// ---------------------------------------------------------------
// 1) 배경 프리셋 선택 (PRESETS 배열 기반으로 카드 자동 생성)
// ---------------------------------------------------------------
let selectedBg = null;

const presetGrid = document.getElementById("preset-grid");
PRESETS.forEach((preset) => {
  const card = document.createElement("div");
  card.className = "preset-card";
  card.dataset.bg = preset.file;
  card.innerHTML = `<img src="${preset.file}" alt="${preset.label}" /><span>${preset.label}</span>`;
  card.addEventListener("click", () => {
    document.querySelectorAll(".preset-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedBg = preset.file;
    document.getElementById("btn-confirm-bg").disabled = false;
  });
  presetGrid.appendChild(card);
});

document.getElementById("btn-start").addEventListener("click", () => showScreen("background"));
document.getElementById("btn-back-to-start").addEventListener("click", () => showScreen("start"));

document.getElementById("btn-confirm-bg").addEventListener("click", async () => {
  if (!selectedBg) return;
  await startCamera(selectedBg);
  showScreen("capture");
});

document.getElementById("btn-change-bg").addEventListener("click", () => {
  stopCamera();
  showScreen("background");
});

// ---------------------------------------------------------------
// 2) 실시간 웹캠 + 인물 분리(Segmentation) + 배경 합성
// ---------------------------------------------------------------
const video = document.getElementById("webcam");
const canvas = document.getElementById("composite");
const ctx = canvas.getContext("2d");

let segmentation = null;
let backgroundImage = null;
let rafId = null;
let stream = null;
let frozenFrame = null;

async function startCamera(bgUrl) {
  backgroundImage = await loadImage(bgUrl);

  stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, aspectRatio: { ideal: 16 / 9 } }, audio: false });
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

  frozenFrame = null;
  renderLoop();
}

function stopCamera() {
  if (rafId) cancelAnimationFrame(rafId);
  if (stream) stream.getTracks().forEach((t) => t.stop());
}

function renderLoop() {
  if (frozenFrame) return;
  segmentation.send({ image: video }).then(() => {
    rafId = requestAnimationFrame(renderLoop);
  });
}

function onSegmentationResult(results) {
  const w = canvas.width, h = canvas.height;
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // 거울처럼 보이도록 좌우 반전 (배경+인물이 함께 뒤집힘)
  ctx.translate(w, 0);
  ctx.scale(-1, 1);

  drawImageCover(ctx, backgroundImage, w, h);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w; maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d");
  maskCtx.drawImage(results.segmentationMask, 0, 0, w, h);
  maskCtx.globalCompositeOperation = "source-in";
  maskCtx.drawImage(results.image, 0, 0, w, h);

  ctx.drawImage(maskCanvas, 0, 0);
  ctx.restore();
  ctx.restore();
}

function drawImageCover(context, img, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;
  if (imgRatio > boxRatio) {
    sh = img.height; sw = sh * boxRatio;
    sx = (img.width - sw) / 2; sy = 0;
  } else {
    sw = img.width; sh = sw / boxRatio;
    sx = 0; sy = (img.height - sh) / 2;
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
// 3) 촬영 → 바로 완료 화면 (결제 기능 없는 버전)
// ---------------------------------------------------------------
let currentSessionId = "no-payment";

document.getElementById("btn-shutter").addEventListener("click", () => {
  frozenFrame = canvas.toDataURL("image/png");
  cancelAnimationFrame(rafId);
  stopCamera();

  document.getElementById("result-photo").src = frozenFrame;
  showScreen("done");
});

function getNextPhotoFilename() {
  // 날짜가 바뀌면 순번이 1부터 다시 시작됩니다 (예: 20260916_1, 20260916_2, ...)
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const key = "chalkchalk_photo_counter";
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    stored = {};
  }
  if (stored.date !== dateStr) stored = { date: dateStr, count: 0 };
  stored.count += 1;

  try {
    localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // localStorage를 못 쓰는 환경이면 그냥 순번 없이 진행
  }

  return `chalkstudio_${dateStr}_${stored.count}`;
}

document.getElementById("btn-download").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = frozenFrame;
  a.download = `${getNextPhotoFilename()}.png`;
  a.click();
});

document.getElementById("btn-restart").addEventListener("click", () => {
  selectedBg = null;
  document.querySelectorAll(".preset-card").forEach((c) => c.classList.remove("selected"));
  document.getElementById("btn-confirm-bg").disabled = true;
  frozenFrame = null;
  showScreen("start");
});
