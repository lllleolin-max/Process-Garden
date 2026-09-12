# Process Garden v2 — Codex Master Build Prompt

> **直接把本文件完整交给 Codex。**
>
> 同时向 Codex 提供两张视觉参考图：
>
> - **Reference A**：Process Garden 正常生态 / 生物发光版本
> - **Reference B**：Process Garden 克苏鲁 / Eldritch 版本
>
> 当前项目尚未开始开发。请从零建立项目，并以本文件作为唯一主规格说明。
>
> **最重要的优先级：**
>
> 1. UI / Visual Quality
> 2. 三种展示模式
> 3. 可扩展主题系统（内置 Garden / Eldritch，并支持添加主题）
> 4. 中英双语与随应用完整分发的主题字体系统
> 5. image2 素材生成与实际集成
> 6. 真实系统数据接入
> 7. 性能、测试、README 与开源发布质量

---

# 0. 最终目标

请从零开发一个名为 **Process Garden v2** 的开源桌面应用。

它不是普通 Task Manager，也不是 `htop` 的视觉换皮。

它要把电脑中真实运行的：

- Processes
- CPU Usage
- Memory Usage
- Network Activity
- Parent-child Relationships
- Threads
- Connections
- Process Birth / Death
- Runtime Spikes

映射为一个会实时：

- 生长
- 活动
- 连接
- 分裂
- 繁殖
- 衰弱
- 消亡

的 **数字生态系统**。

产品最终必须具有足够强的视觉表现力，可以直接用于：

- GitHub README
- Product Hunt
- Hacker News
- Reddit
- X / Twitter
- Demo 视频
- 展会投屏
- 桌面动态壁纸

---

# 1. 产品一句话定义

> **Process Garden transforms running system processes into a living digital ecosystem.**

中文：

> **把电脑运行状态变成一个实时生长的数字生态系统。**

---

# 2. 你的角色

你同时扮演：

- Senior Desktop Application Engineer
- Senior Rust Engineer
- Senior Frontend Engineer
- Creative Coding Engineer
- Real-time Visualization Engineer
- UI / UX Designer
- Motion Designer
- Open-source Product Engineer

不要把任务理解成：

> “先把进程列表读出来，再套一个 React UI。”

而应该理解成：

> **“构建一个视觉本身就是核心产品能力的实时系统可视化应用。”**

---

# 3. 核心开发原则

## 3.1 UI-first

UI、动效、视觉语言和交互体验不是最后阶段。

它们必须从项目第一阶段就进入架构设计。

开发顺序应该更接近：

```text
Visual System
→ UI Skeleton
→ Rendering Engine
→ Demo Data
→ Theme System
→ Mode System
→ Real System Data
→ Optimization
```

而不是：

```text
Backend
→ Backend
→ Backend
→ 随便补 UI
```

---

## 3.2 Reference-driven

你会收到：

- Reference A：正常版
- Reference B：Eldritch 版

先分析两张参考图。

提炼统一的：

- Layout
- Typography
- Information Hierarchy
- Panels
- Border Style
- Glow
- Node Language
- Creature Language
- Timeline
- Inspector
- HUD
- Data Labels
- Motion
- Background Composition

然后再建立主题系统。

不能简单照抄图片，也不能完全忽略参考图。

---

## 3.3 Real Data Driven

所有生态变化必须来自真实系统数据。

允许视觉表现有一定程序化动画，但：

> 数据含义必须稳定。

例如：

- Memory 高 → 生物更大
- CPU 高 → 活动更快
- Network 活跃 → 粒子交换更强

不能随机反转。

---

## 3.4 Local-first & Privacy-first

默认：

- 不上传系统数据
- 不上传进程名称
- 不上传路径
- 不上传网络活动
- 不需要账号
- 不依赖云端
- 不读取进程内存内容
- 不记录用户文件内容

image2 只用于生成静态产品素材，不应拿用户系统数据作为生成输入。

---

## 3.5 Visual + Functional

Process Garden 必须同时做到：

### Visual
- 有艺术性
- 有生命感
- 可截图
- 可录屏
- 能作为壁纸

### Functional
- 数据准确
- 可搜索
- 可查看 PID
- 可查看资源占用
- 可查看父子关系
- 可查看时间线
- 可理解生物对应哪个真实进程

---

# 4. 三种展示模式

必须实现统一架构下的三种 Display Mode：

```ts
type DisplayMode =
  | "windowed"
  | "fullscreen"
  | "wallpaper";
```

---

# 5. Windowed App Mode

这是日常使用的完整应用模式。

## 必备区域

```text
┌─────────────────────────────────────────────┐
│ Top Bar                                     │
├───────────┬─────────────────────┬───────────┤
│           │                     │           │
│ System    │                     │ Process   │
│ Sidebar   │    Process Garden   │ Inspector │
│           │                     │           │
├───────────┴─────────────────────┴───────────┤
│ Process Timeline / Events                   │
└─────────────────────────────────────────────┘
```

至少包含：

- Top App Bar
- System Overview Sidebar
- Main Garden Canvas
- Process Inspector
- Timeline
- Recent Events
- Search
- Settings
- Theme Switcher
- Language Switcher
- Display Mode Switcher
- Pause / Resume

---

# 6. Fullscreen Mode

Fullscreen 不是把窗口放大。

它是一个独立的体验层。

目标：

> **让整块屏幕变成一个活着的系统生态。**

---

## 6.1 Fullscreen 子模式

至少设计：

### Presentation Mode

用于：

- Demo
- 投屏
- 视频录制
- 展览

特征：

- 视觉最大化
- 极少 UI
- 自动镜头缓慢漂移
- 重要事件自然突出

### Monitoring Mode

用于长时间观察。

保留：

- CPU
- Memory
- Process Count
- Top Processes
- Alerts

### Screensaver Mode

尽可能隐藏文字 UI。

只保留：

- 生态系统
- 极轻 HUD
- 时间 / System Stats（可选）

---

# 7. Wallpaper Mode

这是 Process Garden 最重要的产品差异点之一。

壁纸模式必须是 **真正的产品模式**，不能只是导出一张背景图。

---

## 7.1 Passive Wallpaper

特点：

- 低刷新
- 极少 UI
- 低资源
- 信息弱化
- 视觉优先
- 桌面图标清晰可读

---

## 7.2 Live Wallpaper / Ambient Monitor

允许轻量动态和少量数据。

例如：

```text
CPU      27%
Memory   8.4 GB
Processes 241
Top      chrome
```

支持角落 Floating Widget。

---

## 7.3 Wallpaper Layouts

至少考虑：

### Center Core

中央生态核心。

### Bottom Landscape

生态主体集中在屏幕底部。

### Left Cluster

主体偏左，为桌面右侧保留内容空间。

### Ultra-wide Panorama

适配 21:9 / 32:9。

### Minimal Orb

极简，一个核心生命体 + 少量节点。

### Eldritch Abyss

专门用于 Eldritch 主题。

---

## 7.4 Wallpaper 要求

必须考虑：

- 1920×1080
- 2560×1440
- 3840×2160
- 21:9
- Multi-monitor
- Desktop icon readability
- Low CPU
- Low GPU
- Reduced animation mode

---

# 8. 可扩展主题系统

```ts
type BuiltInThemeId = "garden" | "eldritch";
type ThemeId = string;
```

首发必须内置 `garden` 与 `eldritch`。两套内置主题必须：

- 共用数据
- 共用组件
- 共用交互
- 共用布局逻辑
- 共用 Rendering Core

但：

- 色彩
- 生物造型
- 背景
- 粒子
- 纹理
- 装饰
- 动效语言

可以明显不同。

不能只换颜色。

主题切换必须即时生效、无需重载应用，并同时覆盖 Windowed、Fullscreen、Wallpaper、Onboarding、Settings、空状态和图表。用户选择应本地持久化。

---

# 9. Garden Theme

关键词：

```text
bioluminescent
organic
clean
alive
future nature
digital ecosystem
elegant
premium
```

主色：

- Green
- Cyan
- Blue
- Purple
- 少量 Amber

视觉参考：

- 微生物
- 水母
- 植物根系
- 花粉
- 神经元
- 珊瑚
- 发光孢子

整体感觉：

> 科技 × 自然 × 生命。

---

# 10. Eldritch Theme

关键词：

```text
eldritch
abyssal
cosmic horror
deep sea
ancient
mysterious
organic horror
cinematic
```

主色：

- Deep Teal
- Dark Green
- Violet Black
- Cold Cyan
- Small Amber Highlights

参考：

- 深海生命
- 触须
- 古老眼睛
- 黑暗珊瑚
- Abyss
- 异界孢子
- Cosmic Organism

注意：

- 不要 Gore
- 不要廉价 Horror
- 不要卡通怪物
- 不要破坏数据可读性

目标：

> **高级、神秘、深海、异界。**

---

## 10.1 Theme Contract 与添加主题

主题不能散落成组件内部的条件判断。建立稳定、版本化、数据驱动的 `ThemeManifest`，渲染器和组件只消费语义 token 与 asset role：

```ts
interface ThemeManifest {
  schemaVersion: 1;
  id: string;
  name: Record<"en-US" | "zh-CN", string>;
  version: string;
  author?: string;
  basedOn?: BuiltInThemeId;
  colors: Record<string, string>;
  typography: ThemeTypography;
  assets: ThemeAssets;
  effects: ThemeEffects;
  motion: ThemeMotion;
}
```

主题包建议使用 `.pgtheme`（ZIP 容器），至少包含：

```text
manifest.json
preview.webp
assets/
fonts/            # 可选；必须带许可证
LICENSES/
```

必须实现：

- Top Bar / Settings 中可见的 Theme Switcher，展示缩略图、名称与当前状态
- `Add Theme` 入口，而不是只能写死两个按钮
- 从 Garden 或 Eldritch 复制并创建自定义主题
- 导入、预览、校验、安装、启用、导出和删除用户主题
- 内置主题只读，不能被删除；编辑内置主题时自动创建副本
- schema 版本、必填 token、重复 ID、缺失资源和不兼容版本校验
- 安装失败或主题损坏时原子回滚到上一个可用主题
- 主题包不得执行脚本、加载远程代码或引用包外路径
- 限制包体与单文件大小，只允许白名单图片/字体格式，并防止 ZIP path traversal

MVP 的 `Add Theme` 至少提供一个可工作的轻量编辑器：主题名称、基础主题、核心色、字体预设、背景、粒子/辉光强度、实时预览、保存。复杂节点建模、在线主题市场和社区发布可暂缓，但 manifest、导入/导出与扩展点必须从第一版成立。

主题资产缺失时必须使用角色化 fallback，不得白屏：

```text
custom theme asset
→ basedOn theme asset
→ garden safe default
```

主题开发规范、manifest schema、示例包和安全边界写入：

```text
docs/themes.md
docs/theme-authoring.md
schemas/theme-manifest.schema.json
```

---

## 10.2 中英双语与本地化

首发完整支持：

```ts
type AppLocale = "en-US" | "zh-CN";
```

要求：

- 首次启动默认跟随操作系统语言；不支持的语言回退到 `en-US`
- Top Bar 与 Settings 都提供 `中文 / English` 切换，立即生效且无需重启
- 语言选择本地持久化，并在三种 Display Mode 中一致
- 所有用户可见文案必须使用稳定的 i18n key；禁止在组件中硬编码中英文
- 菜单、设置、Onboarding、Tooltip、Inspector、Timeline、空状态、错误、通知和辅助功能标签必须完整翻译
- 日期、时间、数字、百分比、内存单位与复数使用 locale-aware formatter；进程名、路径与 PID 保持原值
- UI 必须容纳中英文长度差异；禁止靠截断掩盖布局问题
- 不使用运行时云翻译，不因语言切换上传任何内容
- 缺失 key 在开发环境明显报警；CI 检查两种语言 key 集合、变量占位符和翻译覆盖率一致

建议使用 `i18next + react-i18next` 或等价的轻量方案，目录示例：

```text
src/i18n/
├── config.ts
├── formatters.ts
└── locales/
    ├── en-US.json
    └── zh-CN.json
```

---

## 10.3 完整主题字体包

“完整字体包”不是让一款哥特字体承担全部 UI，而是为每个主题明确 `display / body / mono / CJK fallback` 四种角色，并保证中英文、数字、单位和符号都可离线显示。

推荐的首发字体组合（最终可选等价的开源字体，但必须记录理由和许可证）：

| Theme | Display / 标题 | Body / UI | 中文 | Mono / 数据 |
|---|---|---|---|---|
| Garden | Space Grotesk | Inter Variable | Noto Sans SC | JetBrains Mono |
| Eldritch | Grenze Gotisch（克制使用的哥特标题） | Spectral 或 Inter | Noto Serif SC（标题）+ Noto Sans SC（密集 UI） | JetBrains Mono |

使用边界：

- 哥特 / Blackletter 只用于 Eldritch 的 Hero、章节标题、主题名或短标签
- PID、指标、表格、Timeline、Tooltip 和正文必须保持高可读性
- 当哥特字体缺少中文 glyph 时，自动回退到 Noto Serif SC，不显示 tofu 方框
- Garden 与 Eldritch 可以改变排版气质，但字体切换不能造成布局跳动或数据难读
- 用户主题可引用应用内置字体角色；若携带字体，必须通过格式、许可证、文件大小和字体元数据校验

分发与性能要求：

- 字体随应用本地分发，不依赖 Google Fonts/CDN 或系统恰好安装的字体
- 优先 WOFF2 与实际使用的 variable/weight；CJK 可使用可审计的 subset + `unicode-range` 分片，但全部分片必须随安装包离线提供，整体覆盖所选 Noto SC 字符集，而不只是当前静态文案
- 必须用包含中文、英文、数字、全角标点、罕见进程名和混排文本的 glyph corpus 做覆盖测试
- 预加载首屏必要字体，其余按主题/语言懒加载；定义 `font-display` 策略，避免不可见文字
- 提供可靠的 system fallback stack；字体加载失败时应用仍完全可用
- 建立 `assets/fonts/`、`assets/fonts/LICENSES/` 与 `docs/fonts.md`
- `docs/fonts.md` 记录 family、版本、来源、许可证、覆盖语言、使用角色、subset 方式和体积
- 安装包和 About / Licenses 页面包含第三方字体许可文本

建议 token：

```css
--font-display
--font-body
--font-mono
--font-cjk-display
--font-cjk-body
```

字体与语言、主题正交：切换语言只改变 locale 和所需 fallback，切换主题只改变 typography role 映射，不能复制整套组件。

---

# 11. 核心生态映射规则

统一建立：

```ts
interface ProcessCreature {
  id: string;
  pid: number;
  parentPid?: number;

  name: string;
  executablePath?: string;
  appGroup: string;

  cpuPercent: number;
  memoryBytes: number;
  networkActivity?: number;

  startedAt: number;

  status:
    | "born"
    | "active"
    | "idle"
    | "stressed"
    | "dying"
    | "dead";
}
```

---

## 11.1 Memory → Size

内存占用控制生物体积。

建议：

```text
visualSize =
  clamp(
    minSize,
    maxSize,
    log(memoryMB + 1) × scale
  )
```

避免 Chrome / IDE 占满屏幕。

---

## 11.2 CPU → Activity

CPU 高：

- Movement ↑
- Pulse ↑
- Particle Activity ↑
- Glow ↑

持续高 CPU：

进入：

```text
stressed
```

状态。

---

## 11.3 Network → Particle Flow

Network Activity 映射为：

- Particle flow
- Pulses
- Light transmission
- Tentacle signal

---

## 11.4 Parent / Child → Growth

新子进程：

从 Parent 附近出生。

可以表现为：

```text
Parent
  │
  ├── child
  ├── child
  └── child
```

视觉：

- 根系
- 神经
- 菌丝
- 触须

---

## 11.5 Birth

新进程出现：

- Spawn animation
- Light pulse
- Name reveal
- Connection formation

---

## 11.6 Death

进程结束：

- Fade
- Collapse
- Particle dissolution
- Tentacle disconnect

Eldritch：

可更诡异。

但仍应克制。

---

# 12. Ecological Mode / Exact Mode

除了 Display Mode，还需要数据展示层级。

```ts
type PopulationMode =
  | "ecological"
  | "exact";
```

---

## Ecological

聚合 Application。

例如 Chrome：

```text
Chrome Colony
├── Browser
├── GPU
├── Renderer × 14
└── Utility × 4
```

表现为一个群落。

---

## Exact

每个 PID 单独显示。

---

# 13. Process Inspector

点击节点显示：

- Name
- PID
- Parent PID
- Executable
- Start Time
- CPU History
- Memory History
- Network History
- Threads
- Connections
- Child Processes
- Ecological Status
- Activity Highlights

第一版不要提供 Kill Process。

避免误操作。

---

# 14. Timeline

必须保留参考图中的 Timeline 概念。

事件包括：

```text
Birth
Exit
Spawn
Fork
Connection
Network
IO
Spike
```

支持：

- Process Filter
- Event Filter
- Pause
- Scrub
- Recent Events

---

## 3.6 Generated-asset fidelity is mandatory

所有承担主题识别、叙事或视觉焦点的成品素材，必须调用 image2 / 图像生成功能制作并实际集成，不能用临时 Canvas 几何图形、CSS 圆形、Emoji、通用图标或低保真占位图冒充最终素材。

这条原则尤其适用于：

- Garden / Eldritch 核心生命体
- 太阳、月亮与昼夜天体
- 生物、Agent 大脑与胚胎阶段
- 栖息地、花粉媒介、主题装饰物
- 克苏鲁口器、组织、粘液等叙事焦点

程序化 Canvas / WebGL 仍用于轨道、粒子、脐带形变、粘液水滴、发光、呼吸和过渡动画；但其承载的主体贴图必须来自图像生成资产管线。每批素材必须经过透明化/切片、主题一致性、实际尺寸可读性和界面实测，未通过不得作为最终交付。

---

# 15. image2：核心开发要求

## 极其重要

image2 不只是：

> “帮项目生成一张 Hero Image。”

而应该被当成：

> **Visual Asset Production Pipeline**

你应该多次调用 image2，生成可实际进入产品的素材。

---

# 16. image2 Asset Pipeline

建议：

```text
assets/
└── generated/
    ├── garden/
    │   ├── cores/
    │   ├── creatures/
    │   ├── backgrounds/
    │   ├── celestial/
    │   ├── wallpaper/
    │   ├── overlay/
    │   ├── splash/
    │   └── concept/
    │
    ├── eldritch/
    │   ├── cores/
    │   ├── creatures/
    │   ├── backgrounds/
    │   ├── celestial/
    │   ├── wallpaper/
    │   ├── overlay/
    │   ├── splash/
    │   └── concept/
    │
    └── icons/
```

---

# 17. image2 生成顺序

不要乱生成。

严格按优先级执行。

---

# P0 — 必须首先生成

## 17.1 Central Core Entities

Garden：

```text
garden_core_v1
garden_core_v2
garden_core_v3
```

Eldritch：

```text
eldritch_core_v1
eldritch_core_v2
eldritch_core_v3
```

用途：

- Main Canvas
- Fullscreen
- Wallpaper
- README
- Splash

要求：

- 主体清楚
- 结构完整
- 中央构图
- 深色背景
- 可用于透明抠图或融合
- 高分辨率
- 不依赖文字

---

## 17.2 Process Creatures

至少生成以下类型：

```text
chrome
vscode
node
python
docker
postgres
spotify
terminal
explorer
system
```

每个：

```text
garden creature
eldritch creature
```

即至少：

```text
10 × 2 = 20
```

个基础节点视觉。

---

## 17.3 Creature Design Rules

Chrome：

- 多子节点
- 活跃
- 像大型殖民群落

VS Code：

- 蓝色
- 神经 / 晶体风

Node：

- 紫色 / 绿色
- 网络化

Python：

- 蓝 / 黄
- 柔和流体

Docker：

- 橙 / 蓝
- 工业感

Postgres：

- 紫 / 蓝
- 稳重
- 数据核心

System：

- 大型
- 古老
- 稳定
- 像生态基础生命

---

# 18. Backgrounds

## Garden Backgrounds

至少：

```text
garden_bg_clean
garden_bg_particles
garden_bg_bioluminescent
```

---

## Eldritch Backgrounds

至少：

```text
eldritch_bg_abyss
eldritch_bg_fog
eldritch_bg_tentacles
```

注意：

背景不能比 Process Nodes 更抢眼。

---

# 19. Wallpaper Assets

这是重要资产。

优先生成：

## Garden

```text
garden_wallpaper_center_core_16_9
garden_wallpaper_minimal_orb_16_9
garden_wallpaper_panorama_21_9
garden_wallpaper_4k
```

## Eldritch

```text
eldritch_wallpaper_abyss_16_9
eldritch_wallpaper_core_16_9
eldritch_wallpaper_panorama_21_9
eldritch_wallpaper_4k
```

---

# 20. P1 image2 Assets

主 UI 成型后继续生成。

---

## 20.1 Overlay

Garden：

- glow frame
- soft particles
- light vignette
- translucent organism texture

Eldritch：

- ancient frame
- tentacle corner
- abyss vignette
- occult organic patterns

注意：

UI 装饰必须轻。

不要影响可读性。

---

## 20.2 Splash Screens

至少：

```text
garden_splash
eldritch_splash
```

---

## 20.3 Mode Preview Images

用于 Settings / Onboarding：

```text
windowed_preview
fullscreen_preview
wallpaper_preview
```

Garden / Eldritch 可各做一组。

---

## 20.4 Empty States

例如：

```text
no_process
paused
demo_mode
loading
```

---

# 21. P2 image2 Assets

---

## 21.1 Icon Concepts

image2 可以生成风格概念，但最终 UI 图标尽可能转为：

- SVG
- CSS
- Vector

需要：

```text
CPU
Memory
Network
Processes
Threads
Search
Settings
Theme
Mode
Fullscreen
Wallpaper
Demo
Birth
Death
Spawn
Network
IO
Spike
```

---

## 21.2 Event Icons

```text
Birth
Death
Fork
Spawn
Connection
IO
Network
Spike
```

---

# 22. image2 素材管理

每生成一批素材：

更新：

```text
docs/assets.md
```

记录：

```text
Asset
Theme
Purpose
Mode
Source
Integrated?
Notes
```

例如：

```text
garden_core_v2.png
Theme: garden
Purpose: central organism
Mode: window/fullscreen
Source: image2
Integrated: yes
```

---

# 23. 素材命名规范

必须统一。

例如：

```text
garden_core_main_v1.png

garden_creature_chrome_v1.png
garden_creature_python_v1.png

eldritch_creature_chrome_v1.png

garden_wallpaper_center_4k_v1.png

eldritch_wallpaper_abyss_21_9_v1.png
```

---

# 24. UI Design System

建立：

```text
src/design-system/
├── tokens/
├── themes/
├── typography/
├── contracts/
├── components/
├── icons/
└── motion/
```

---

# 25. Design Tokens

必须定义：

```text
colors
spacing
radius
font-size
font-weight
font-family
font-line-height
font-letter-spacing
border-opacity
shadow
glow
blur
animation-duration
easing
z-index
```

---

# 26. UI Components

至少：

```text
AppShell

Sidebar
SidebarCard

MetricCard

GardenCanvas

CreatureNode
CreatureLabel

ProcessInspector

TimelinePanel
EventBadge

FloatingHUD

WallpaperWidget

ThemeSwitcher
AddThemeDialog
ThemePreview
LanguageSwitcher
ModeSwitcher
PopulationModeSwitcher

SearchOverlay
ProcessTooltip

SettingsPanel
```

---

# 27. Motion Language

统一动效系统。

---

## Birth

```text
scale 0 → 1
opacity 0 → 1
particle burst
connection growth
```

---

## Death

```text
opacity ↓
scale ↓
particles disperse
links dissolve
```

---

## Selected

```text
outline pulse
glow
camera focus
```

---

## Ambient

```text
slow drift
breathing
particle motion
subtle tendril movement
```

---

# 28. 可访问性

需要支持：

```text
Reduced Motion
High Contrast
Labels Always Visible
Color-blind-safe status indicators
Keyboard navigation
Screen-reader labels in en-US and zh-CN
```

关键状态不能只靠颜色。

自定义字体、哥特标题和主题装饰不能破坏 WCAG 对比度、键盘焦点或正文可读性；200% 缩放与中英文切换后关键操作仍必须可达。

---

# 29. 推荐技术栈

优先：

```text
Tauri 2
Rust
React
TypeScript
Vite
Zustand
PixiJS
```

如 Canvas 2D 足够，也可以使用。

仅当确实必要时进入 WebGL。

---

# 30. Rust System Layer

推荐：

```text
sysinfo
```

可结合平台 API。

目录：

```text
src-tauri/src/
├── collectors/
├── models/
├── commands/
├── platform/
├── privacy/
└── tests/
```

---

# 31. Platform Strategy

优先：

```text
Windows 11
```

然后：

```text
macOS
Linux
```

不要为了三端首发导致 Windows MVP 半成品。

---

# 32. Data Sampling

默认：

```text
1000ms
```

支持：

```text
500
1000
2000
5000
```

---

# 33. Delta Transport

不要每秒发送完整历史。

使用：

```ts
interface ProcessDelta {
  timestamp: number;

  created: ProcessSnapshot[];

  updated: ProcessSnapshot[];

  terminated: TerminatedProcess[];

  system: SystemSnapshot;
}
```

---

# 34. History Buffer

每个 Process：

默认：

```text
10 min
```

使用：

```text
ring buffer
```

---

# 35. Rendering Performance

目标：

```text
60 FPS
```

200 Process：

> 流畅。

500：

> 可操作。

5000：

> Full visualization 应考虑聚合与 LOD。

---

# 36. Rendering 优化

考虑：

- Spatial index
- LOD
- Label culling
- Entity pooling
- Incremental update
- Batched particles
- Canvas cache
- Offscreen rendering

---

# 37. Wallpaper Performance Mode

必须单独降低资源消耗。

例如：

```text
FPS: 15 / 30
Sampling: 2–5 sec
Particles: low
Labels: minimal
Network visualization: optional
```

---

# 38. Demo Mode

必须有。

例如：

```bash
process-garden demo
```

或者 App 内：

```text
Demo Mode ON
```

---

Demo Mode 应模拟：

- Chrome 爆发子进程
- VS Code 编译
- Docker 启动
- Python task
- Postgres database activity
- Spotify network
- Process death
- CPU spike

用于：

- README GIF
- Presentation
- Screenshot
- Development

---

# 39. Settings

至少：

### General

```text
Launch at startup
Sampling rate
Language: System / 中文 / English
```

### Garden

```text
Population Mode
Node density
Labels
Animation
Particles
```

### Themes

```text
Theme gallery
Garden
Eldritch
Custom themes
Add Theme
Import / Export / Delete
Live preview
```

### Display

```text
Window
Fullscreen
Wallpaper
```

### Wallpaper

```text
Monitor
FPS
Layout
Widgets
```

### Privacy

```text
Network activity
Command line
History
Clear history
```

---

# 40. 隐私

默认：

```text
NO TELEMETRY
NO ACCOUNT
NO CLOUD
NO CODE CONTENT
NO MEMORY CONTENT
NO FILE CONTENT
```

README 明确说明。

---

# 41. 项目目录建议

```text
process-garden/

├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md

├── docs/
│   ├── architecture.md
│   ├── ui-system.md
│   ├── visual-language.md
│   ├── themes.md
│   ├── theme-authoring.md
│   ├── fonts.md
│   ├── localization.md
│   ├── modes.md
│   ├── assets.md
│   ├── privacy.md
│   ├── performance.md
│   ├── decisions.md
│   └── roadmap.md

├── assets/
│   ├── fonts/
│   │   ├── garden/
│   │   ├── eldritch/
│   │   ├── shared/
│   │   └── LICENSES/
│   ├── generated/
│   │   ├── garden/
│   │   │   ├── cores/
│   │   │   ├── creatures/
│   │   │   ├── wallpaper/
│   │   │   ├── backgrounds/
│   │   │   └── overlay/
│   │   │
│   │   └── eldritch/
│   │       ├── cores/
│   │       ├── creatures/
│   │       ├── wallpaper/
│   │       ├── backgrounds/
│   │       └── overlay/
│   │
│   └── static/

├── schemas/
│   └── theme-manifest.schema.json

├── src/
│   ├── app/
│   ├── design-system/
│   ├── components/
│   ├── i18n/
│   │   ├── config.ts
│   │   ├── formatters.ts
│   │   └── locales/
│   │       ├── en-US.json
│   │       └── zh-CN.json
│   │
│   ├── features/
│   │   ├── garden/
│   │   ├── inspector/
│   │   ├── timeline/
│   │   ├── settings/
│   │   ├── themes/
│   │   │   ├── built-in/
│   │   │   ├── custom/
│   │   │   ├── importer/
│   │   │   └── validator/
│   │   ├── modes/
│   │   ├── wallpaper/
│   │   └── demo/
│   │
│   ├── rendering/
│   │   ├── engine/
│   │   ├── creatures/
│   │   ├── effects/
│   │   ├── layout/
│   │   └── particles/
│   │
│   ├── stores/
│   ├── types/
│   ├── utils/
│   └── tests/

└── src-tauri/
    ├── Cargo.toml
    └── src/
        ├── collectors/
        ├── commands/
        ├── models/
        ├── platform/
        ├── privacy/
        └── tests/
```

---

# 42. Development Phases

严格按阶段推进。

---

## Phase 0 — Reference Analysis

首先：

1. 分析 Reference A
2. 分析 Reference B

输出：

```text
docs/reference-analysis.md
```

总结：

- Layout
- Colors
- Typography
- Creatures
- Panels
- Motion
- Differences
- Shared language

---

# Phase 1 — UI Skeleton

先不接系统 API。

使用 Demo Data。

完成：

```text
Windowed Mode
Garden Theme
Sidebar
Canvas
Inspector
Timeline
i18n key-based UI skeleton
```

做到：

> 已经非常像真正产品。

---

# Phase 2 — Theme Engine + Localization + Typography

完成：

```text
Garden
Eldritch
ThemeManifest + schema validation
Theme gallery + instant switching
Add Theme lightweight editor
Theme import / export / delete
en-US
zh-CN
Language switcher
Theme-aware font roles
Offline font loading + fallback
```

Theme 切换：

> 实时。

语言切换同样必须实时。此阶段结束前，以中英文分别检查 Windowed UI，并验证 Eldritch 哥特标题缺字时的中文回退。

---

# Phase 3 — image2 P0

生成：

- Core
- Creatures
- Backgrounds
- Wallpaper

集成进 UI。

不要只存文件。

---

# Phase 4 — Fullscreen

完成：

```text
Presentation
Monitoring
Screensaver
```

---

# Phase 5 — Wallpaper

完成：

```text
Passive
Live
```

并支持：

```text
1080p
1440p
4K
21:9
```

---

# Phase 6 — Real System Data

接入：

```text
Processes
CPU
Memory
Parent Child
Network
```

替换 Demo 数据。

---

# Phase 7 — Ecological Engine

完成：

```text
birth
death
spawn
grouping
movement
pulse
links
```

---

# Phase 8 — Inspector + Timeline

完成真实数据历史。

---

# Phase 9 — Performance

测试：

```text
200
500
1000
```

Process Entities。

---

# Phase 10 — Release

完成：

```text
README
GIF
Screenshots
Installer
CI
Contributing
License
Security
Third-party font licenses
Theme authoring example package
```

---

# 43. 测试

Rust：

```text
snapshot diff
created
updated
terminated
grouping
ring buffer
privacy
sampling
```

Frontend：

```text
resource → visual mapping
theme manifest validation
theme inheritance and fallback
theme import/export round trip
corrupt theme rollback
i18n key parity
i18n interpolation variables
locale-aware formatting
font role resolution
font load failure fallback
mode
search
selection
timeline
settings
```

E2E：

```text
launch
garden visible
garden ↔ eldritch theme switch without reload
add/import/enable/delete custom theme
invalid theme package rejected safely
English ↔ 中文 switch without restart
no missing translation keys in critical flows
no missing glyph/tofu in bundled UI copy
fullscreen
wallpaper
search
inspector
pause
resume
```

---

# 44. README

README 第一屏必须非常强。

建议：

```md
# Process Garden

Your computer is alive.

Process Garden turns processes, CPU, memory,
network activity and process relationships
into a living digital ecosystem.
```

然后直接展示：

```text
GIF
```

---

README 至少：

1. Hero
2. Demo GIF
3. Window Mode
4. Fullscreen
5. Wallpaper
6. Garden Theme
7. Eldritch Theme
8. Custom Theme / Add Theme
9. English / 中文 localization
10. Fonts and third-party licenses
11. How It Works
12. Installation
13. Privacy
14. Performance
15. Roadmap
16. Contribution

---

# 45. GitHub 传播设计

整个项目要考虑：

> 15 秒视频能不能让别人立刻理解？

需要：

### Hook

```text
Your computer is alive.
```

或者：

```text
What if Task Manager was a living ecosystem?
```

---

### Demo

视频：

```text
Chrome launch
↓
new organism born
↓
Chrome opens tabs
↓
children multiply
↓
CPU spike
↓
organism pulses
↓
close Chrome
↓
organism dies
```

这是最重要的传播演示之一。

---

# 46. MVP 必须完成

## Product

- [ ] Windowed Mode
- [ ] Fullscreen Mode
- [ ] Wallpaper Mode
- [ ] Garden Theme
- [ ] Eldritch Theme
- [ ] Instant Theme Switcher
- [ ] Add Theme + custom theme manifest
- [ ] Theme import / export / safe fallback
- [ ] English (`en-US`)
- [ ] 简体中文 (`zh-CN`)
- [ ] Offline theme-aware font packages

## UI

- [ ] Sidebar
- [ ] Garden Canvas
- [ ] Inspector
- [ ] Timeline
- [ ] Search
- [ ] Settings
- [ ] HUD
- [ ] Language Switcher
- [ ] Theme Gallery / Add Theme Dialog

## Engine

- [ ] Real process list
- [ ] CPU
- [ ] Memory
- [ ] Parent-child
- [ ] Birth
- [ ] Death
- [ ] Grouping

## Visual

- [ ] image2 P0 assets
- [ ] Core Entities
- [ ] Creature Set
- [ ] Backgrounds
- [ ] Wallpaper Assets
- [ ] Garden typography set
- [ ] Eldritch typography set with restrained Gothic display font
- [ ] Complete CJK fallback without missing glyphs
- [ ] Font licenses and inventory

## Developer Quality

- [ ] Tests
- [ ] Build
- [ ] GitHub Actions
- [ ] README
- [ ] Demo

---

# 47. 暂缓

第一版不要过度投入：

```text
AI Diagnosis
Cloud
Account
Remote Monitoring
Plugin Marketplace
Online Theme Marketplace
Mobile
Complex 3D
Social Features
```

---

# 48. Agent 工作方式

必须遵守：

1. 检查当前仓库。
2. 当前项目尚未开始时，从零初始化。
3. 阅读两张 Reference Image。
4. 先建立 `docs/reference-analysis.md`。
5. 给出极简实施计划。
6. 立即开始写代码。
7. 先完成 UI Skeleton。
8. 使用 Demo Data。
9. 再做 image2 资产。
10. 将资产实际接入项目。
11. 再接真实系统 API。
12. 每完成 Phase：
   - build
   - lint
   - test
13. 错误立即修。
14. 不要等待用户逐阶段批准。
15. 遇到非关键选择自行做合理决定。
16. 重要决定写：
   ```text
   docs/decisions.md
   ```
17. image2 素材写：
   ```text
   docs/assets.md
   ```
18. 主题 contract、扩展与示例写入 `docs/themes.md` 和 `docs/theme-authoring.md`。
19. 字体来源、版本、覆盖范围、subset 和许可证写入 `docs/fonts.md`。
20. 中英翻译规范、key 命名与格式化规则写入 `docs/localization.md`。

---

# 49. 禁止行为

不要：

- 只输出方案
- 只输出伪代码
- 只做 Figma / static mockup
- 只生成 image2 图片而不写代码
- 把三种模式做成三个毫无关系的应用
- 把两主题仅实现成颜色切换
- 把 Theme 写死成只能容纳两个值且没有 manifest contract
- 只放一个无功能的 `Add Theme` 按钮
- 在组件中硬编码用户可见的中英文字符串
- 依赖联网字体、未授权字体或操作系统恰好安装的字体
- 在正文、指标和表格中过度使用哥特字体
- 允许主题包执行脚本、访问远程代码或越权读取包外文件
- 大量 hardcode UI
- 用假数据冒充真实系统数据
- 为追求视觉效果牺牲基本可读性

---

# 50. 最终验收

只有以下条件全部满足才算完成：

- [ ] 项目可以启动
- [ ] Windows MVP 可以运行
- [ ] Windowed 可用
- [ ] Fullscreen 可用
- [ ] Wallpaper 可用
- [ ] Garden Theme 完成
- [ ] Eldritch Theme 完成
- [ ] 两个内置主题可即时切换并持久化
- [ ] Add Theme 可创建或导入真实可用的自定义主题
- [ ] 自定义主题可预览、校验、导入/导出、启用和删除
- [ ] 损坏或不安全的主题包会被拒绝且应用安全回退
- [ ] English 与简体中文覆盖完整关键流程并可即时切换
- [ ] 语言切换后日期、数字、单位和布局正确
- [ ] Garden / Eldritch 字体角色完整、离线可用、无缺字方框
- [ ] Eldritch 哥特字体只用于展示性短文本，数据 UI 保持清晰
- [ ] 字体许可证、来源和 subset 信息已归档
- [ ] Reference 图的核心设计语言得到体现
- [ ] 两主题不只是换色
- [ ] image2 被多次调用
- [ ] image2 素材已实际进入产品
- [ ] 所有主题焦点素材均由 image2 生成；不存在几何占位图冒充最终素材
- [ ] 生物与真实 Process 对应
- [ ] CPU / Memory 影响视觉
- [ ] Parent-child 可见
- [ ] Birth / Death 可见
- [ ] Inspector 可用
- [ ] Timeline 可用
- [ ] Demo Mode 可用
- [ ] Wallpaper 有真正壁纸价值
- [ ] Fullscreen 有展示价值
- [ ] UI 可直接截图放 README
- [ ] Test 通过
- [ ] Build 通过
- [ ] README 完整
- [ ] Privacy 文档完整
- [ ] Theme authoring、fonts 与 localization 文档完整

---

# 51. 最终执行命令

现在开始。

执行顺序：

```text
1. Inspect repository
2. Analyze Reference A + Reference B
3. Create docs/reference-analysis.md
4. Initialize project
5. Build design system
6. Build Windowed UI using demo data
7. Build versioned theme engine + Garden / Eldritch
8. Build Theme Gallery + Add / Import / Export Theme
9. Build en-US / zh-CN localization and instant language switch
10. Bundle, license, load and verify theme-aware font packages
11. Call image2 for P0 assets
12. Integrate generated assets
13. Build Fullscreen
14. Build Wallpaper
15. Connect real system data
16. Build ecological behaviors
17. Complete Inspector
18. Complete Timeline
19. Optimize performance
20. Run tests, including theme/i18n/font failure paths
21. Build installer
22. Create screenshots / GIF in both themes and languages
23. Complete README and authoring/license docs
```

不要停留在讨论阶段。

**直接开始构建 Process Garden v2。**
