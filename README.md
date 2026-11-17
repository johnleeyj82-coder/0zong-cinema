# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## 마라톤 플래너 + 안드로이드 앱

탭 네 개로 나뉘어요.

- **마라톤**: 고른 극장(CGV, 메가박스, 씨네Q, 라이카시네마)의 시간표를 앱에서 바로 불러와, 내 가능 시간 안에 드는 회차만 보여줘요. 날짜를 고르면 포스터로(영화를 누르면 그 영화 회차만) 또는 시간으로(아침·오후·저녁·심야 순서) 볼 수 있고, '내 극장'으로 극장을 고정할 수 있어요. 하나 담으면 '이 다음엔?'을 눌러 끝나는 시간 이후 회차만 이어서 골라요. 겹치는 회차는 막히고, 이동이 빠듯하면 알려줘요. 담은 회차는 TMDB 포스터를 넣은 티켓 이미지로 발권해 저장·공유할 수 있어요.
- **기록**: 영화를 검색해서 6개 항목(몰입감·여운·서사·인물·연출·취향, 100점)을 슬라이더로 채점하고 포스터 그리드로 모아 봐요. 점수는 왓챠피디아 별점(0.5 단위)으로도 바꿔 복사할 수 있고, 기록이 10편을 넘으면 내 점수 분포에 맞춘 보정 별점을 써요. 예전 기록은 그대로 남아 있어요.
- **결산**: 다 본 회차의 순위, 총 상영 시간, 다닌 극장 수를 보여주고 결산 카드 이미지로 저장해요.
- **설정**: 기간, 날짜별 가능 시간, 극장, TMDB 키를 바꿔요.

회차가 끝나고 10분 뒤에 "채점하러 가기" 알림이 와요.

### APK 받기

`feat/marathon-app` 또는 `main`에 올리면 GitHub Actions가 APK를 만들어 **Releases**에 올려요.
휴대폰에서 Releases의 `0zong-cinema.apk`를 받아 설치하면 돼요. 처음 한 번은 "출처를 알 수 없는 앱 설치"를 허용해야 해요.

TMDB 키는 저장소 **Settings > Secrets and variables > Actions**에 `TMDB_KEY`로 넣어 두면 앱에 들어가요. 넣지 않았다면 앱의 설정 탭에서 입력해도 돼요.
`.env`는 더 이상 저장소에 올리지 않아요(`.env.example` 참고).

### 직접 빌드

```bash
npm ci
npm run cap:sync          # 웹 빌드 후 android/ 로 복사
npm run apk               # Android SDK가 있으면 android/app/build/outputs/apk/debug/ 에 APK
```

### 알아둘 점

- 극장 시간표는 각 극장 사이트가 내부에서 쓰는 주소로 불러와요. 공식 공개 API가 아니라 사이트가 바뀌면 고쳐야 할 수 있어요. 개인용으로만 써요.
- 웹 브라우저에서는 극장 서버가 막아서 시간표를 못 불러오고, 2026-11-17에 저장해 둔 시간표를 대신 보여줘요.
- This product uses the TMDB API but is not endorsed or certified by TMDB.
