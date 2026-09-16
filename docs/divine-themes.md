# 神圣天使与奥林匹斯

在顶部主题入口选择「神圣天使」或「奥林匹斯」。两者也可以作为自定义主题的基础，生成完整 AI 素材提示词并导出 `.pgtheme`。

| 主题 | 核心与视觉 | 结束动作 |
| --- | --- | --- |
| 神圣天使 `angel` | 完整人形天使、象牙白羽翼、黄金、蓝宝石，天界圣所 | `wing` 圣光笼罩，托起进程并引回天使胸前怀抱 |
| 奥林匹斯 `olympus` | 宙斯式神祇、大理石、月桂、青金石，希腊神殿 | `spear` 蓄雷、掷出雷霆之矛，命中后目标原地迸裂消散 |

每套均独立制作 9 张图片：`core`、`background`、`process1`、`process2`、`habitat`、`pollinator`、`agent`、`celestial`、`capture`。除核心和背景外均为 2×2 图集。`process3/4` 是可选变体；这两套主题不需要吞噬口 `maw`。程序负责运动、黑底处理及图集切分。

`capture-v2.png` 格序：天使为圣光束、羽毛星光、双翼怀抱、轻盈光环；奥林匹斯为完整水平右向雷矛、命中雷爆、施法星芒、消散碎光。新版提示词与来源保存在 `public/assets/generated/refined/divine-exit-v2.json`。旧月桂素材保留供自定义主题使用。拖入中心会先显示接引预览，确认后执行退出动画；取消会恢复进程。

所有图片实际使用 `image_gen.imagegen` 生成，完整提示词、原始来源、实际尺寸与文件大小保存在：

- `public/assets/generated/refined/angel/GENERATION.json`
- `public/assets/generated/refined/olympus/GENERATION.json`

PNG 与记录保存在同一主题目录。以实际记录尺寸为准，不将提示词中的期望尺寸作为交付尺寸。
