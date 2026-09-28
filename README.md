# 찰칵찰칵 사진관 - 결제 없는 버전

`chalkchalk-studio`에서 NFC 결제 기능만 뺀 버전입니다.
전자칠판에서 NFC가 웹으로 인식되지 않을 경우 이 버전을 그대로 GitHub/Azure에 올려서 쓰면 됩니다.

## 차이점
- `payment.html`, `payment.js` 없음 (태블릿 결제 화면 자체가 없음)
- `server.js`가 세션/WebSocket 없이 정적 파일만 제공하는 단순한 서버로 축소됨
- 촬영 버튼을 누르면 결제 과정 없이 바로 "사진 저장하기" 화면으로 이동

## 실행 방법 (로컬)
```bash
npm install
npm start
# http://localhost:3000
```

## Azure 배포
`chalkchalk-studio`의 README에 있는 Azure 배포 순서와 동일합니다 (GitHub 업로드 → Web App 생성 →
배포 센터 연결). 이 버전은 WebSocket을 쓰지 않으므로 "웹 소켓 켜기" 단계는 생략해도 됩니다.

## 배경 이미지 교체
`chalkchalk-studio`와 동일하게, `public/main.js` 맨 위의 `PRESETS` 배열을 수정하면 됩니다.
투명도가 있는 이미지는 필요 없습니다 (자세한 설명은 `chalkchalk-studio/내일_할일.md` 참고).
