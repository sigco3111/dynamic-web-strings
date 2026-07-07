# 🕸️ dynamic-web-strings

> HTML5 Canvas **Verlet Integration** spider-web simulator — draw webs with your mouse, drag threads to apply tension (shown in red), and watch them snap with a 'TING!' when overstressed.

Each new strand spawns a chain of **Verlet points + distance constraints** that respond naturally to gravity and wind. Dragging on an existing string transfers real tension to the constraint graph, which is color-coded by stretch ratio (green → yellow → red) and breaks when it exceeds a threshold.

[🇰🇷 한국어](./README.md) · [🇺🇸 English (current)](#)

---

## 🎬 Live Demo

> **👉 [https://dynamic-web-strings.vercel.app/](https://dynamic-web-strings.vercel.app/)** — runs in any browser

| | |
|---|---|
| ![Demo](https://img.shields.io/badge/Live-Demo-7C3AED?style=for-the-badge&logo=vercel&logoColor=white) | [![Repo](https://img.shields.io/badge/GitHub-sigco3111%2Fdynamic--web--strings-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sigco3111/dynamic-web-strings) |
| ![Status](https://img.shields.io/badge/Status-Live-22C55E?style=flat-square) | ![Stack](https://img.shields.io/badge/Stack-Vanilla_JS-F7DF1E?style=flat-square&logo=javascript&logoColor=black) |
| ![License](https://img.shields.io/badge/License-MIT-F1C40F?style=flat-square) | ![Deps](https://img.shields.io/badge/Dependencies-0-9CA3AF?style=flat-square) |

### Quick Start
1. Click the demo link above → page opens in your browser
2. **Drag (wall → wall)** — draw a new spider thread
3. **Drag (on a thread)** — apply tension (turns red as strain climbs)
4. **Push it past the limit** — the link snaps with a 'TING!' + particle burst
5. Tune **wind / gravity / thread strength / count** via the right-side HUD

---

## 🤖 Generation Info

This project was generated end-to-end with the following model and prompt.

| Item | Value |
|---|---|
| **Model** | MiniMax-M3 |
| **Runtime** | OpenCode CLI |
| **Repository** | [`sigco3111/dynamic-web-strings`](https://github.com/sigco3111/dynamic-web-strings) |
| **Live Demo** | [https://dynamic-web-strings.vercel.app/](https://dynamic-web-strings.vercel.app/) |
| **License** | MIT |
| **Dependencies** | None (Vanilla JS, single HTML) |

### Original Prompt

```
마우스 클릭으로 벽과 벽 사이에 거미줄을 칠 수 있고, 생성된 거미줄들이 중력에 의해 자연스럽게 처지면서 바람의 세기에 따라 현실적으로 흔들리는 시뮬레이션을 만들되, 마우스로 줄을 잡아당기면 장력(Tension)이 시각적으로 붉게 표시되다가 한계점을 넘으면 '팅' 하고 끊어지는 효과를 구현해줘.
Implementation Advice: Use Verlet Integration. Model each spider web thread as a series of connected points (constraints). Calculate distance deviations for tension and break the link if it exceeds a limit. 모든 의존관계의 코드를 하나의 HTML에 담는 형태로 코드 작성.
```

> Note: original prompt is in Korean — it is preserved verbatim in the file so future readers can compare. Brief English gloss: *Verlet-based spider-web drawing sim; click walls to draw threads; gravity + wind; drag thread to add tension (shown in red); snap at threshold.*

---

## ✨ Features

- 🕷️ **Verlet Integration** — position-based solver gives natural gravity + wind response without explicit velocity tracking
- 🖱️ **Wall-to-wall drag** — auto-snap anchors to the closest edge so any draw gesture is valid
- 🔴 **Tension visualization** — per-constraint color mapped to stretch ratio `|L − L₀| / L₀` (green → yellow → red)
- 💥 **Physics-driven break** — overstressed constraints self-remove with a 'TING!' tone + particle burst
- 🌬️ **Live wind** — sinusoidal noise + 0..2.5 strength slider for calm-to-stormy shaking
- 🎛️ **4 live sliders** — wind / gravity / thread strength / count
- 📦 **Single HTML** — zero external dependencies, opens with double-click

---

## 🚀 Quick Start

### Option 1: Live Demo (easiest)
👉 [https://dynamic-web-strings.vercel.app/](https://dynamic-web-strings.vercel.app/)

### Option 2: Open the file directly
```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Option 3: Local server
```bash
python3 -m http.server 8000
# → http://localhost:8000
```

---

## 🎮 Controls

### Mouse
| Input | Effect |
|---|---|
| **Drag (empty wall → empty wall)** | Create a new spider thread (Verlet constraint chain) |
| **Drag (on thread)** | Apply tension to thread (red color climbs with strain) |
| **Past threshold** | Constraint breaks + 'TING!' + particle burst |

### Keyboard
| Key | Effect |
|---|---|
| `Space` | Toggle wind on / off |
| `R` | Reset all threads |
| `+` / `=` | Wind strength +0.1 |
| `−` / `_` | Wind strength −0.1 |

### HUD Sliders (right-side panel)
| Slider | Range | Default | Effect |
|---|---|---|---|
| Wind strength | 0 ~ 2.5 | 0.80 | windFactor when wind is on |
| Gravity | 0 ~ 2 | 1.00 | gravity scale |
| Thread strength | 0.2 ~ 1.5 | 0.55 | break threshold multiplier |
| Web count | 1 ~ 18 | 8 | max concurrent threads |

---

## 🛠️ Tech Stack

| Area | Choice |
|---|---|
| **Rendering** | HTML5 Canvas 2D Context |
| **Physics** | Verlet Integration + Distance Constraints (sub-iteration relaxation) |
| **Hit-test** | Mouse drag + raycast (constraint / vertex probe) |
| **Audio** | WebAudio API (OscillatorNode + gain envelope) |
| **Loop** | `requestAnimationFrame` |
| **Build** | None (single HTML) |
| **Deps** | None |

### Core algorithm in one block

```
distance = constraint.restLength
delta = current - rest
correction = delta.normalize() * (delta.length - distance) * 0.5
each end -= correction (mass-weighted)
stress = clamp((|current − rest| − rest) / rest, 0, 2)
if stress > threshold: remove constraint; playTing(stress)
```

---

## 📂 Project Structure

```
dynamic-web-strings/
├── index.html        # single HTML (HTML + CSS + JS inline)
├── README.md         # Korean (default)
├── README.en.md      # English
└── LICENSE           # MIT
```

---

## 🎨 Design Choices

Four brainstorm decisions made before implementation:

| Decision | Pick | Why |
|---|---|---|
| **Integrator** | Verlet Integration | Position-based; pairs naturally with distance constraints (vs RK4/Euler overhead) |
| **Tension viz** | stretch ratio per constraint → color | Simple scalar; readable just before break |
| **Sound** | WebAudio oscillator + throttle | No external mp3; pitched 'TING!' synthesised on the fly (≤ 8 beeps/sec) |
| **Anchor policy** | 4-side auto-snap (`snapDistance = 24`) | User never enters exact coords; nearest wall wins |

### Want to customize?

Adjust the `CONFIG` block at the top of `index.html`:

```js
const CONFIG = {
  damping: 0.99,                  // 0.95 ~ 0.999 (higher = less damping)
  substeps: 2,                    // integration precision
  iterations: 2,                  // distance constraint relax passes
  snapDistance: 24,               // wall-snap radius (px)
  anchorStep: 16,                 // anchor grid (px)
  breakThrottleMs: 120,           // break cooldown
  maxAudioBeepsPerSecond: 8,
  defaultWebCount: 8,
  minWebCount: 1,
  maxWebCount: 18,
};
```

---

## 🗺️ Roadmap

- [x] **v0.1** — single HTML MVP + Verlet integration + click-to-draw
- [x] **v0.2** — tension visualization + 'TING!' snap + audio
- [x] **v0.3** — HUD sliders (wind / gravity / strength / count) + Vercel deploy + live demo
- [ ] **v0.4** — multi-anchor threads + inter-web lattice
- [ ] **v1.0** — automated tests + formal release

---

## 📜 License

MIT © 2026 sigco3111

---

## 🙏 Acknowledgments

- **Model**: MiniMax-M3 + OpenCode CLI
- **Coding mission origin**: [cokac.com — 코드깎는노인](https://cokac.com/list/announcement/24)
