# 🕸️ Dynamic Web Strings (동적 거미줄과 장력)

> Interactive **Verlet Integration** spider‑web simulator — draw webs with your mouse, drag threads to apply tension, watch them **snap** when overstressed.

![status](https://img.shields.io/badge/status-bootstrap-blue) ![tech](https://img.shields.io/badge/stack-vanilla%20HTML%2BJS-orange) ![model](https://img.shields.io/badge/generated%20by-MiniMax--M3-purple)

---

## 🎯 Mission Brief

> 마우스 클릭으로 벽과 벽 사이에 거미줄을 칠 수 있고, 생성된 거미줄들이 중력에 의해 자연스럽게 처지면서 바람의 세기에 따라 현실적으로 흔들리는 시뮬레이션을 만들되, 마우스로 줄을 잡아당기면 장력(Tension)이 시각적으로 붉게 표시되다가 한계점을 넘으면 '팅' 하고 끊어지는 효과를 구현해줘.

### Implementation Advice
- Use **Verlet Integration**.
- Model each spider‑web thread as a series of connected points (**constraints**).
- Calculate distance deviations for tension.
- Break the link if tension exceeds a limit.
- **모든 의존관계의 코드를 하나의 HTML에 담는 형태** (single file, zero dependencies).

---

## 🧪 Generation Provenance

이 저장소의 코드는 아래 환경에서 자동 생성되었습니다.

| Field | Value |
|---|---|
| **Authoring agent** | `OpenCode` CLI |
| **LLM 모델** | **MiniMax-M3** (`MiniMax/M3` via MiniMax provider) |
| **Generation date** | 2026-07-07 |
| **Repository** | [sigco3111/dynamic-web-strings](https://github.com/sigco3111/dynamic-web-strings) |
| **File layout** | 단일 HTML 파일 (모든 CSS / JS 인라인, 외부 의존 0) |

### Original Prompt (한글 원문)

```
마우스 클릭으로 벽과 벽 사이에 거미줄을 칠 수 있고,
생성된 거미줄들이 중력에 의해 자연스럽게 처지면서
바람의 세기에 따라 현실적으로 흔들리는 시뮬레이션을 만들되,
마우스로 줄을 잡아당기면 장력(Tension)이 시각적으로 붉게 표시되다가
한계점을 넘으면 '팅' 하고 끊어지는 효과를 구현해줘.

Implementation Advice:
- Use Verlet Integration.
- Model each spider web thread as a series of connected points (constraints).
- Calculate distance deviations for tension and break the link if it exceeds a limit.
- 모든 의존관계의 코드를 하나의 HTML에 담는 형태로 코드 작성.
```

---

## 🚀 Quick Start

```bash
# 가장 쉬운 방법: 그냥 브라우저로 열기
open index.html     # macOS
xdg-open index.html # Linux
start index.html    # Windows
```

또는 정적 서버로:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

> 외부 의존이 없으므로 인터넷 연결 없이도 동작합니다.

---

## 🎮 Controls (구현 후 추가 예정)

| Input | Action |
|---|---|
| `Click + Drag` (벽 → 벽) | 새 거미줄 칠하기 |
| `Click + Drag` (줄 위) | 줄 잡아당기기 — 장력 가하기 |
| `Space` | 바람 멈추기 / 다시 불기 |
| `R` | 모두 리셋 |
| `+ / −` | 바람 세기 조절 |

*Tension이 임계치를 넘으면 `TING!` 시각/청각 효과와 함께 절단됩니다.*

---

## 📐 Technical Pillars (예정)

- **Verlet Integration** — 포지션 기반 적분, 외란(`gravity`, `wind`)에 자연스럽게 반응
- **Distance Constraints** — 인접 점 사이 거리를 N회 완화(relax)하여 tension 계산
- **Tension Visualization** — stretch ratio `|L − L₀| / L₀` → 색상(녹→황→**적**) 매핑
- **Breaking Point** — 임계 초과 시 constraint 제거 + 파티클 burst

---

## 📂 Repository Structure (예정)

```
dynamic-web-strings/
├── README.md          ← this file
├── index.html         ← 🎯 entire app (HTML + CSS + JS inline)
├── LICENSE            ← MIT
└── .gitignore         ← node_modules, .DS_Store …
```

---

## 📜 License

[MIT](./LICENSE) — 자유롭게 사용 / 수정 / 재배포 가능.
