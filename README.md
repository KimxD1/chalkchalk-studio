# 찰칵찰칵 사진관

동화책 배경 위에서 사진을 찍는 웹 포토부스입니다. 배경 선택 → 촬영(타이머) → 저장까지 브라우저 안에서 처리됩니다.

## 기능
- **배경 3종 선택**: 바다 속 집 / 하늘 위 유치원 / 과자집
- **실시간 인물 합성**: 웹캠 영상에서 사람만 오려 배경 위에 얹습니다 (MediaPipe)
- **화면비 16:9**, **거울 모드**: 카메라에 잡힌 사람만 좌우 반전(거울처럼)되고, 배경은 원본 방향 그대로입니다. 저장되는 사진도 같은 모습입니다.
- **카메라 정중앙 배치**: 폰·태블릿·PC·전자칠판 어떤 화면 크기에서도 카메라가 화면 정중앙에 옵니다.
- **타이머**: 촬영 화면 왼쪽 "⏱ 3초" 버튼 → 끔 / 3초 / 5초 / 10초 또는 1초 단위 직접 설정(0~60초).
  카운트다운 중 셔터(✕)를 다시 누르면 취소됩니다. 설정은 그 기기에 저장되며 처음 기본값은 3초입니다.
- **다시 찍기**: 저장 화면에서 같은 배경으로 다시 촬영합니다.
- **저장 파일명**: `chalkstudio_20260928_1.png`, `_2`, `_3` … 날짜가 바뀌면 순번이 1부터 다시 시작합니다.
  순번은 그 브라우저(기기)에 저장되므로, 전자칠판을 초기화하거나 다른 기기에서 열면 리셋될 수 있습니다.
- **반응형**: 화면 크기에 맞춰 글자·버튼·카메라 크기가 자동으로 조절됩니다.

## 폴더 구성
```
(저장소 최상위)/
├── package.json
├── server.js              # public 폴더를 그대로 보여주는 아주 단순한 서버
├── README.md
└── public/
    ├── index.html
    ├── main.css
    ├── main.js
    └── backgrounds/       # 배경 이미지 3장
```

## 로컬에서 실행
```bash
npm install
npm start
# 주소창에 http://localhost:3000 입력
```
파일을 더블클릭해서 여는 방식(`file:///...`)은 지원되지 않습니다. 반드시 위 주소나 배포된 https 주소로 여세요.
웹캠은 `https://` 또는 `localhost` 에서만 동작합니다.

## Azure에 올리기 (GitHub 연동)
1. 이 폴더의 **내용물**을 GitHub 저장소 최상위에 올립니다 (`package.json`이 저장소 맨 위에 보여야 합니다).
2. Azure Portal → Web App 만들기: 런타임 **Node 22 LTS**, 운영체제 **Linux**. 요금제 F1(무료)도 되지만
   첫 접속이 느려질 수 있어 실제 운영에는 B1 이상을 권장합니다.
3. 게시 프로필 방식으로 배포합니다.
   - Web App → `구성` → `일반 설정`에서 `SCM 기본 인증 게시 자격 증명`을 **켬**으로 저장
   - Web App `개요` → `게시 프로필 다운로드` → 파일 내용 전체 복사
   - GitHub 저장소 `Settings` → `Secrets and variables` → `Actions` → 이름 `AZURE_WEBAPP_PUBLISH_PROFILE`, 값 = 복사한 내용
   - 저장소의 `.github/workflows/` 안에 아래 파일 하나를 둡니다 (`app-name`은 Azure Web App 이름과 같아야 함).
4. 이후로는 GitHub에서 파일을 고쳐 커밋하면 자동 배포됩니다 (1~3분).

```yaml
name: Build and deploy Node.js app to Azure Web App - chalk-studio

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'

      - name: npm install
        run: npm install --omit=dev

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: 'chalk-studio'
          slot-name: 'Production'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .
```
**주의**: Azure Portal의 `배포 센터`에서 GitHub를 다시 연결하면 로그인 방식이 다른 워크플로 파일이 하나 더 생겨서
`No subscriptions found` 오류로 실패합니다. 연결하지 마시고, 이미 생겼다면 그 파일을 삭제하세요.

## 배경 이미지 바꾸기
1. 새 이미지를 `public/backgrounds/` 폴더에 넣습니다. 투명도는 필요 없습니다 (사람은 따로 오려서 그 위에 얹기 때문에
   배경은 화면을 꽉 채우는 일반 사진이면 됩니다). 형식 JPG/PNG, 비율 16:9(예: 1920×1080) 권장.
2. `public/main.js` 맨 위의 `PRESETS` 배열에서 파일명과 이름을 바꿉니다.
```js
const PRESETS = [
  { file: "backgrounds/01_house_in_the_sea.png", label: "바다 속 집" },
  { file: "backgrounds/02_on_the_sky.png", label: "하늘 위 유치원" },
  { file: "backgrounds/03_snack_house.png", label: "과자집" },
];
```

## 파일을 고칠 때 꼭 지킬 것
`index.html`, `main.css`, `main.js` **세 파일은 서로 짝**입니다. 화면 구조나 스타일이 바뀌는 수정은 세 파일을 함께 올려야 하고, 하나만 올리면 화면이 깨집니다.
(`main.js` 안의 동작만 바뀐 수정은 `main.js` 하나만 교체해도 됩니다. 이런 경우 수정 때마다 안내해 드립니다.)
세 파일에는 같은 버전 표시(`2026-09-28-r5`)가 들어 있고, 서로 다르면 화면 맨 위에 빨간 안내가 뜹니다.
안내가 뜨면 세 파일을 같은 폴더의 최신 파일로 모두 덮어쓰고 Ctrl+F5로 새로고침하세요.
파일을 수정하면 세 파일의 버전 표시를 같은 값으로 함께 올려야 안내가 정확합니다
(`index.html`의 `app-version`, `main.css`의 `--app-version`, `main.js`의 `APP_VERSION`).

## 문제 해결
| 증상 | 확인할 것 |
|---|---|
| 카메라가 안 켜짐 | 주소가 `https://` 또는 `localhost`인지, 브라우저의 카메라 권한이 허용인지 |
| "이 사이트에서는 권한을 요청할 수 없음" (안드로이드 전자칠판) | 화면 위에 떠 있는 오버레이(하단 메뉴 막대 등)를 접거나 끄고 "다시 시도하기", 또는 주소창 자물쇠에서 카메라를 미리 허용 |
| 로고만 남고 화면이 비어 있음 | 세 파일이 서로 다른 버전이라는 뜻입니다. 위 "파일을 고칠 때 꼭 지킬 것" 참고 |
| 배포는 성공인데 옛 화면이 보임 | Ctrl+F5(강력 새로고침) |
