# Project instructions

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## 素材制作：必须调用生图模型

- 涉及视觉素材的新增、替换或重设计，**必须实际调用生图模型**制作精美素材。包括背景、核心、生物、Agent、环境、天体，以及触手、藤蔓、机械缆索等动画的可见美术部件。
- 先读取可用的 imagegen 技能。默认使用内置生图工具，不能只写提示词、展示概念说明或用粗糙的 Canvas 线条、CSS 图形、SVG、程序纹理代替最终素材。
- 已有合格素材可以直接复用；纯粹修复时序、物理、事件逻辑、裁切或加载逻辑不必重复生图。程序负责驱动美术部件的伸展、缠绕、回收和合成，不负责冒充精细美术制作。
- 已获用户认可的蓝色深海克苏鲁以原图为参考精修，保留造型、青蓝发光和鲜明的紫/绿/琥珀点缀，不得擅自替换成灰绿、低饱和的写实海怪。黑红眼睛主题独立保留为「猩红凝视」。
- 生成前明确主题风格、材质、尺寸、图集格序、透明/纯黑底要求及与现有素材的匹配关系。完成后把图片保存到项目内，记录提示词、来源和用途，再接入实际运行的界面。
- 必须检查实际渲染效果：缩放后的清晰度、接缝、黑边、前后遮挡、轮廓、风格一致性及完整动画。仅生图成功或编译通过不能当作视觉验收通过。
- 生图失败或不可用时如实说明，保留已有合格素材，不得悄悄改用粗糙程序绘图作为已完成的替代方案。
- 保持主题模块化：共用生命周期和动作时序，由主题提供素材及表现参数；新增素材角色时同步更新导入槽、包校验、AI 提示词、素材清单和作者文档。明确必须制作的图片、可继承的素材与程序自动驱动的动作。
