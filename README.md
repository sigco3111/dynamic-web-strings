# 🕸️ dynamic-web-strings

> HTML5 Canvas 기반 Verlet Integration 거미줄 시뮬레이터 — 마우스로 거미줄을 그리고, 줄을 잡아당기면 장력이 붉게 발광하다가 임계 초과 시 '팅' 하고 끊어집니다.

벽과 벽 사이에 거미줄을 칠 때마다 **Verlet 포인트 + 거리 제약**으로 시뮬레이션이 누적되고, 바람과 중력에 의해 자연스럽게 처지면서, 마우스로 줄을 끌어당기면 **tension 시각화**(녹→황→적)로 물리적 부하가 드러나며, 임계치를 넘으면 **'팅' 효과음과 함께 연결이 절단**되는 인터랙티브 데모입니다.

[🇰🇷 한국어 (기본)](#) · [🇺🇸 English](./README.en.md)

---

## 🎬 라이브 데모

> **👉 [https://dynamic-web-strings.vercel.app/](https://dynamic-web-strings.vercel.app/)** — 브라우저에서 바로 실행

| | |
|---|---|
| ![Demo](https://img.shields.io/badge/Live-Demo-7C3AED?style=for-the-badge&logo=vercel&logoColor=white) | [![Repo](https://img.shields.io/badge/GitHub-sigco3111%2Fdynamic--web--strings-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sigco3111/dynamic-web-strings) |
| ![Status](https://img.shields.io/badge/Status-Live-22C55E?style=flat-square) | ![Stack](https://img.shields.io/badge/Stack-Vanilla_JS-F7DF1E?style=flat-square&logo=javascript&logoColor=black) |
| ![License](https://img.shields.io/badge/License-MIT-F1C40F?style=flat-square) | ![Deps](https://img.shields.io/badge/Dependencies-0-9CA3AF?style=flat-square) |

### 🎮 빠른 사용법
1. 위 데모 링크 클릭 → 브라우저에서 페이지 열기
2. **드래그 (벽 → 벽)** — 새 거미줄 칠하기
3. **드래그 (줄 위)** — 줄을 잡아당기며 tension 가하기 (붉게 발광)
4. **한계점 초과** — 'TING!' 소리와 함께 줄이 끊어짐 + 파티클 burst
5. **바람 / 중력 / 거미줄 개수 / 줄 강도** — 우측 HUD 슬라이더로 실시간 조절

---

## 🤖 생성 정보

이 프로젝트의 코드는 아래 모델과 프롬프트를 이용해 **자동으로 생성**되었습니다.

| 항목 | 값 |
|---|---|
| **모델** | MiniMax-M3 |
| **실행 환경** | OpenCode CLI |
| **저장소** | [`sigco3111/dynamic-web-strings`](https://github.com/sigco3111/dynamic-web-strings) |
| **라이브 데모** | [https://dynamic-web-strings.vercel.app/](https://dynamic-web-strings.vercel.app/) |
| **라이선스** | MIT |
| **의존성** | 없음 (Vanilla JS, 단일 HTML) |

### 📝 사용된 프롬프트

```
마우스 클릭으로 벽과 벽 사이에 거미줄을 칠 수 있고, 생성된 거미줄들이 중력에 의해 자연스럽게 처지면서 바람의 세기에 따라 현실적으로 흔들리는 시뮬레이션을 만들되, 마우스로 줄을 잡아당기면 장력(Tension)이 시각적으로 붉게 표시되다가 한계점을 넘으면 '팅' 하고 끊어지는 효과를 구현해줘.
Implementation Advice: Use Verlet Integration. Model each spider web thread as a series of connected points (constraints). Calculate distance deviations for tension and break the link if it exceeds a limit. 모든 의존관계의 코드를 하나의 HTML에 담는 형태로 코드 작성.
```

---

## ✨ 주요 특징

- 🕷️ **Verlet Integration** — 포지션 기반 적분으로 중력/바람에 자연스러운 반응
- 🖱️ **벽-스냌 벽 드래그** — 자동 anchor로 어디든 거미줄을 칠 수 있음
- 🔴 **Tension 시각화** — stretch ratio `|L − L₀| / L₀`에 따라 색상이 녹→황→적 그라데이션
- 💥 **물리적 절단** — 임계치 초과 시 constraint 제거 + 파티클 burst + TING 사운드
- 🌬️ **바람 동적 시뮬** — 사인 노이즈 + 강도 슬라이더 (0~2.5)로 흔들림 조절
- 🎛️ **4개 라이브 슬라이더** — 바람 / 중력 / 줄 강도 / 거미줄 개수 실시간 조절
- 📦 **단일 HTML** — 외부 의존성 0개, 파일 하나만 열면 실행

---

## 🚀 실행 방법

### 방법 1: 라이브 데모 (가장 간단)
👉 [https://dynamic-web-strings.vercel.app/](https://dynamic-web-strings.vercel.app/) — 클릭 한 번

### 방법 2: 그냥 브라우저로 열기
```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### 방법 3: 로컬 서버 (권장)
```bash
python3 -m http.server 8000
# → http://localhost:8000
```

---

## 🎮 조작법

### 마우스
| 입력 | 효과 |
|---|---|
| **드래그 (빈 벽 → 빈 벽)** | 새 거미줄 생성 (Verlet sub-constraint 연결) |
| **드래그 (줄 위)** | 줄을 잡아당기며 tension 가하기 |
| **임계 초과** | 'TING!' 사운드와 함께 constraint 절단 + 파티클 burst |

### 키보드
| 키 | 효과 |
|---|---|
| `Space` | 바람 on / off 토글 |
| `R` | 모든 거미줄 리셋 |
| `+` / `=` | 바람 세기 +0.1 |
| `−` / `_` | 바람 세기 −0.1 |

### HUD 슬라이더 (우측 패널)
| 슬라이더 | 범위 | 기본값 | 효과 |
|---|---|---|---|
| 바람 세기 | 0 ~ 2.5 | 0.80 | wind factor (켜진 상태) |
| 중력 | 0 ~ 2 | 1.00 | gravity scale |
| 줄 강도 | 0.2 ~ 1.5 | 0.55 | break threshold multiplier |
| 거미줄 개수 | 1 ~ 18 | 8 | 동시 유지 거미줄 수 |

---

## 🛠️ 기술 스택

| 영역 | 사용 기술 |
|---|---|
| **렌더링** | HTML5 Canvas 2D Context |
| **물리** | Verlet Integration + Distance Constraints (sub-iteration) |
| **감지** | Mouse drag + raycast (constraint / vertex hit-test) |
| **사운드** | WebAudio API (OscillatorNode + gain envelope) |
| **루프** | `requestAnimationFrame` |
| **빌드** | 없음 (단일 HTML) |
| **의존성** | 없음 |

### 핵심 알고리즘 한 줄 요약

```
distance = constraint.restLength
delta = current - rest
correction = delta.normalize() * (delta.length - distance) * 0.5
each end -= correction (mass-weighted)
stress = clamp((|current − rest| − rest) / rest, 0, 2)
if stress > threshold: remove constraint; playTing(stress)
```

---

## 📂 프로젝트 구조

```
dynamic-web-strings/
├── index.html        # 단일 HTML (HTML + CSS + JS 모두 인라인)
├── README.md         # 한국어 (기본)
├── README.en.md      # English
└── LICENSE           # MIT
```

---

## 🎨 디자인 결정

브레인스토밍 단계에서 내린 결정 4가지:

| 결정 포인트 | 선택 | 이유 |
|---|---|---|
| **물리 적분법** | Verlet Integration | 속도 누적이 자연스럽고 거리 제약과 잘 맞음 (RK4/Euler 대비) |
| **Tension 시각화** | stretch ratio per constraint → 색상 | 단순 scalar로 절단 직전 가독성 확보 |
| **사운드** | WebAudio oscillator + throttle | 외부 mp3 의존 없이 'TING!' 클립 합성 (max 8 beeps/sec) |
| **Anchor 정책** | 4면 자동 스냅 (`snapDistance = 24`) | 사용자가 좌표를 정확히 모름 → 가장 가까운 벽에 자동 부착 |

### 직접 커스터마이즈하고 싶다면

`index.html` 상단 `CONFIG` 블록에서 다음 상수를 조정하면 분위기를 바꿀 수 있어요:

```js
const CONFIG = {
  damping: 0.99,                  // 0.95 ~ 0.999 (높을수록 덜 닳음)
  substeps: 2,                    // 적분 정밀도
  iterations: 2,                  // distance constraint 완화 횟수
  snapDistance: 24,               // 벽 스냅 픽셀
  anchorStep: 16,                 // anchor 위치 그리드 (px)
  breakThrottleMs: 120,           // 절단 쿨다운
  maxAudioBeepsPerSecond: 8,
  defaultWebCount: 8,             // 시작 거미줄 수
  minWebCount: 1,
  maxWebCount: 18,
};
```

---

## 🗺️ 로드맵

- [x] **v0.1** — 단일 HTML MVP + Verlet 적분 + 클릭 거미줄
- [x] **v0.2** — Tension 시각화 + 'TING!' 절단 + 사운드
- [x] **v0.3** — HUD 슬라이더 (바람/중력/줄 강도/거미줄 개수) + Vercel 배포 + 라이브 데모
- [ ] **v0.4** — 다중 anchor + 거미줄 사이 연결 (web lattice)
- [ ] **v1.0** — 테스트 자동화 + 정식 출시

---

## 📜 License

MIT © 2026 sigco3111

---

## 🙏 Acknowledgments

- **모델**: MiniMax-M3 + OpenCode CLI
- **코딩미션 참조 페이지**: [cokac.com — 코드깎는노인](https://cokac.com/list/announcement/24)
