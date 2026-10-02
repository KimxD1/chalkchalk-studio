/**
 * 찰칵찰칵 사진관 - 서버
 * 정적 파일(public 폴더)만 제공하는 단순한 서버입니다.
 * 촬영, 타이머, 저장은 모두 브라우저 안에서 처리됩니다.
 */

const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`찰칵찰칵 사진관 서버 실행 중: http://localhost:${PORT}`);
});
