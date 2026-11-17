// 미리보기(아티팩트) 빌드용: 글꼴 파일 수백 개를 싣는 대신 Google Fonts를 불러요
const l = document.createElement('link')
l.rel = 'stylesheet'
l.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400&family=IBM+Plex+Sans+KR:wght@400;500;700&display=swap'
document.head.appendChild(l)
