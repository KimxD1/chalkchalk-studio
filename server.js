/**
 * 찰칵찰칵 사진관 - 서버
 * 태블릿/세션 중계 없이, 정적 파일만 제공하는 단순한 서버입니다.
 * 촬영과 결제(NFC)가 모두 같은 페이지(브라우저) 안에서 처리됩니다.
 */

const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`찰칵찰칵 사진관 서버 실행 중: http://localhost:${PORT}`);
});
