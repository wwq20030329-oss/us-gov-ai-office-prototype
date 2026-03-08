# US Gov AI Office Prototype

这是第二次整合后的本地原型：
- **主管理后台骨架**沿用早期管理端结构，并已清理主要可见旧品牌外壳
- **像素办公室核心渲染/引擎/资源**直接移植自 `xmanrui/OpenClaw-bot-review`
- 整体可见叙事改为 **白宫 / 联邦机构 / 办公桌协同**，并以**中文界面优先**呈现

## 这次修正了什么

上一版的问题是：
- Office 页面只是一个“像素风格的仿制展示页”
- 没有真正把 `OpenClaw-bot-review` 的 pixel-office 前端引擎接进来

这一次已经改为：
- 在 `src/pages/Office.tsx` 中，直接运行移植过来的真实 pixel-office Canvas 引擎
- 同步接入当前原型现有 `/api/status` 数据，把 bot/account 数据映射为办公室内活动角色
- 保留现有管理端导航、登录、页面壳层与后台接口结构
- 将主要可见导航、品牌、登录入口文案改为中文优先

## 本次真实移植的上游内容

直接从 `OpenClaw-bot-review` 移植到本仓库：

### 1) Pixel-office 前端核心源码
复制到：`src/pixel-office/`

包含：
- `engine/officeState.ts`
- `engine/renderer.ts`
- `engine/characters.ts`
- `engine/matrixEffect.ts`
- `layout/*`
- `editor/*`
- `sprites/*`
- `bugs/*`
- `types.ts`
- `constants.ts`
- `floorTiles.ts`
- `wallTiles.ts`
- `notificationSound.ts`
- `agentBridge.ts`
- `colorize.ts`

这些文件不是重新手写的 mock，而是直接复用上游 pixel-office 的真实实现。

### 2) Pixel-office 资源文件
复制到：`public/assets/pixel-office/`

包含：
- `characters/char_0.png` ~ `char_5.png`
- `walls.png`
- `pixel-adventure.mp3`
- `photograph.webp`
- `my-photographic-works/*.webp`

## 当前整合方式

### 当前管理端壳层仍负责：
- 主导航 / 后台壳层
- 登录流程
- 主题切换
- 现有 API 调用结构
- 其它管理页面

### OpenClaw-bot-review 的 pixel-office 现在负责：
- 办公室平面布局
- 像素人物渲染
- 家具 / 墙体 / 地板 / sprite 绘制
- Canvas 主循环
- 办公室视觉氛围与更真实的上游办公室观感

### 当前桥接方式

由于上游项目原本是 Next.js 页面，本仓库是 Vite/React 管理端，所以本次采用了**真实引擎移植 + 本地页面适配桥接**，而不是生硬 iframe 假嵌入。

具体做法：
- 保留 `OpenClaw-bot-review` 的 `src/pixel-office/*` 逻辑主体
- 在 `src/pages/Office.tsx` 中建立 Vite 侧壳层
- 将 `/api/status` 返回的 bot 列表映射成 `AgentActivity[]`
- 用上游的 `syncAgentsToOffice()` 驱动真实办公室角色状态
- 用上游 `renderFrame()` 绘制真实办公室 Canvas 画面

## 已完成的中文化

已处理的主要可见文案：
- 主品牌：`US Gov AI Office` → `白宫 AI 办公局`
- `Situation Room` → `战情室`
- `Pixel Office` → `像素办公室`
- `Agencies` → `联邦机构`
- `Briefing Board` → `简报板`
- `Reports Hub` → `报告中心`
- 登录页主要标题 / 按钮 / 提示语 改为中文
- 新 Office 页主体说明与统计说明 改为中文

## 仍然未完全完成的部分

这次虽然已经把**真实 pixel-office 引擎**接进来，但仍有边界：

1. **没有完整照搬上游全部 Next 页面外围功能**
   - 上游 `app/pixel-office/page.tsx` 中还有大量专用 API、悬浮面板、工具栏、版本面板、网关健康、贡献热力图等交互
   - 当前原型没有把这些外围配套 API 一并完整搬运

2. **Office 页目前是“真实办公室引擎 + 当前原型状态接口”的桥接版**
   - 真实办公室画面已经接入
   - 但不是 100% 原样复制上游完整业务层页面

3. **其它管理页面仍可能残留英文/旧叙事**
   - 本次重点修正是 Office 主视图与主要入口文案
   - 全站中文统一还可以继续做一轮清理

## 关键文件

### 主要新增 / 重要变更
- `src/pages/Office.tsx`
  - 从旧的仿制页面，改成运行真实移植 pixel-office 引擎的页面
- `src/pixel-office/**`
  - 真实移植的 OpenClaw-bot-review pixel-office 核心源码
- `public/assets/pixel-office/**`
  - 真实移植的上游资源文件
- `src/App.tsx`
  - 主导航与品牌文案中文化
- `src/pages/Login.tsx`
  - 登录页中文化
- `src/components/Logo.tsx`
  - 品牌文案中文化

## 本地运行

```bash
npm install
npm run dev:full
```

默认会同时启动：
- 前端 Vite dev server（默认 `5173`）
- 本地 API server（默认 `18790`）

也可以分开启动：

```bash
npm run dev
npm run dev:server
```

环境变量示例见：
- `.env.example`

说明：
- `server/index.js` 现在会优先读取 `BOLUO_AUTH_TOKEN`
- 如果未显式设置，会自动回退到 `~/.openclaw/openclaw.json` 中的 `gateway.auth.token`

## 本次验证

已至少执行并验证：
- `npm run build`

## 2026-03 Phase 2 第二轮（界面统一与产品感收口）

本轮重点不再是继续补历史命名，而是把真正可见的前端壳层和四个主视图收成统一产品：
- 全局颜色、卡片、边框、阴影、标题层级改成同一套设计 token，不再是“深色页 + 零散金色字”的拼贴感
- 侧栏升级成更完整的控制台壳层：品牌区、当前视图、运行时长、导航、底部操作的结构更稳定
- Dashboard / Office / Departments / Sessions 的页头、统计卡片、筛选区、内容面板统一为同一套控制台样式
- 弱化大量 emoji 带来的 demo 感，保留必要语义，但把重点交回信息层级、留白和状态表达
- 登录页同步拉回到同一产品视觉语言，避免首页和内页完全像两个系统

验证：
- 执行 `npm run build`

补充：Phase 2 第二轮继续推进后，令牌统计、系统态势、通信频道、日志、搜索这些中层页面也开始纳入同一套视觉体系，而不再只有四个主视图是“新产品”，其它页还是“旧后台”。

## 2026-03 Phase 2 第一轮（后台一体化与语义统一）

本轮开始把 Dashboard / Office / Departments / Sessions 当成同一产品的四个主视图来收口，而不是独立原型页：
- 抽出统一的 `officeSemantics` 语义层，集中管理产品名、状态词、渠道显示名与任务生命周期文案
- Dashboard、Office、Departments、Sessions 统一改用“机构席位 / 办公大厅 / 会话任务 / 执行中 / 待命 / 归档”等语义
- Office 不再只强调“像素页面”，而是明确作为和机构席位、会话任务联动的办公大厅主视图
- 四个主视图补上统一的主标题骨架与跨页入口，Dashboard → Sessions、Departments → Office/Sessions、Office → Departments/Sessions 已形成真实联动
- 新增“焦点机构”上下文：从 Dashboard / Departments / Office 进入 Sessions 后，过滤条件会继续带回 Office / Departments，四个主视图开始共享同一条机构级浏览路径
- README / 页面标题层面补上本轮目标，方便后续继续 Phase 2 收口

## 结论

这次不是再做一个“像素风 mock 页面”，而是：
- **确实把 OpenClaw-bot-review 的真实 pixel-office 前端引擎和资源搬进来了**
- **保留现有主管理后台壳层，但已移除主要可见旧品牌残留**
- **把主要可见 UI 改成中文优先，并维持白宫/联邦办公室叙事**

如果要继续下一轮，最值得补的方向是：
1. 继续把上游 `page.tsx` 中的面板/交互逐步迁入
2. 把 server 端补齐更多 pixel-office 专用 API
3. 统一全站剩余页面的中文文案与白宫机构叙事


## 2026-03 本轮推进

本轮重点不是继续修像素细节，而是把原型从“古风壳子套白宫词”进一步推进为**中文优先的美国政府 AI 办公原型**：
- 主要导航继续中文化，并把“频道/报告”等入口改成更行政化命名
- 战情室页把残留的“下旨 / 圣旨 / 旨意记录”改成“下达指令 / 指令 / 指令记录”
- 后端 `AGENT_DEPT_MAP` 统一改成白宫/联邦机构语义，前端联邦机构、会话、简报等页面会直接看到新的机构命名
- Notion 人员/机构模拟数据也同步去掉“尚书”等古风称呼
- 保留现有 pixel-office 集成方式，不做重写


## 2026-03 导航与图标统一清理

本轮继续做了一次更聚焦的可见壳层统一，重点是把侧栏从“emoji 拼贴感”拉回到更专业的政府控制台语气：
- 侧栏导航改为统一的线性 SVG 图标集，不再混用大量 emoji
- `战情指挥` 标签图标从不合适的 `🇺🇸` 改为更专业的盾徽/指挥语义图标
- 侧栏底部的刷新、主题切换、移动端菜单按钮也统一到同一套图标语言
- 登录页顶部去掉国旗 emoji，改为复用联邦盾徽 Logo，减少不专业的装饰感

## 2026-03 可见壳层清理

本轮专门清理了浏览器真实可见的旧壳层残留，重点不是文档措辞，而是用户打开页面时会看到的内容：
- `index.html` 页面标题从 `菠萝王朝管理后台` 改为 `白宫 AI 办公局控制台`
- 首屏加载占位从菠萝 emoji 改为政府风格徽章加载提示
- favicon 从默认 `vite.svg` 改为 `public/gov-seal.svg`
- 侧栏 / 移动端头部统一使用联邦盾徽风格 Logo 组件，移除旧 `PineappleLogo` 命名与菠萝可见符号
- 浏览器构建产物已重新生成，`dist/index.html` 不再带 `菠萝王朝管理后台`

说明：
- 仍可能存在少量**非用户可见**的历史命名或旧设计文档引用，例如旧迁移来源说明、历史设计文档标题等
- 本轮目标是先确保**实际浏览器可见前端壳层**不再混入明显的“菠萝王朝/古风后台”品牌

## 2026-03 主视图残留清理（本轮）

本轮继续针对**真实浏览器已渲染页面**做清理，而不是只改内部命名：
- Dashboard 主视图把 `Token Usage Ranking` 改为 `Token 消耗排行`
- Dashboard 主视图把 `AGENCIES状态 / Agencies状态` 统一改为 `联邦机构状态`
- Office 主视图顶部把 `White House / Pixel Office` 改为 `白宫 / 像素办公室`
- Office / Dashboard / 联邦机构 / Token 统计页增加统一显示名映射，优先显示中文机构名
- 对 `people-officials`、`emperor`、`司礼监` 等历史残留 agent id 增加过滤/抑制逻辑，避免它们在主视图、排行、机构卡片、像素办公室席位中继续作为现役机构出现
- 如果这些残留来自历史 session 数据，则通过前后端映射/过滤层抑制显示，而不是直接破坏底层历史文件

本轮已再次执行：
- `npm run build`

## 2026-03 清理补丁（显示名 / 中文标签 / 负载语义）

本轮又做了一次针对真实渲染结果的修补：
- 前后端统一补上 `claude-code` → `Claude 研发助理`、`xhs-agent` → `小红书运营助理` 的显示名映射，避免主界面继续暴露原始 agent id
- Dashboard、Token 统计、机构页、会话页、导航标签继续把 `Token` 改为 `令牌` 等中文优先表述
- Dashboard 和系统态势页不再把 `loadavg` 直接伪装成 CPU 百分比；主界面改为明确显示 `1 分钟负载`，系统页趋势图也改为负载均值语义
- 继续确保 `emperor` 仅作为内部历史脏值过滤词存在，不在主渲染 UI 中作为机构名出现
