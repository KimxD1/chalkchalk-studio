/**
 * 찰칵찰칵 사진관 - 결제 없는 버전
 * NFC 결제 기능을 뺀 버전입니다. 배경 선택 → 촬영 → 저장까지만 동작합니다.
 * 세션/WebSocket/결제 관련 코드가 전부 빠져서 단순한 정적 파일 서버입니다.
 */

const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`찰칵찰칵 사진관(결제 없는 버전) 서버 실행 중: http://localhost:${PORT}`);
});
