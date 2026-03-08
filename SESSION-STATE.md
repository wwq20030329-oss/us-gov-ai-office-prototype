# SESSION-STATE.md

## Project
us-gov-ai-office-prototype

## Current Goal
把“AI 朝廷 / 多代理协作”的核心制度骨架，稳定迁移为**现代政府风格的多代理协作办公后台**：
- 可以现代化 UI / 语言 / 品牌
- 但不能丢掉多代理分工、审议、派发、执行、回报、归档这条主链路

## Current Phase
Phase 2 — 产品化收口 + 多代理制度链路做实

## What Is Already Done
- 主方向已确认：不是古风朝廷皮肤，而是现代政府办公系统风格。
- 主视图已经基本统一：Dashboard / Office / Departments / Sessions 已有统一控制台外壳。
- 语义层已开始统一：机构席位、办公大厅、会话任务、执行中 / 待命 / 归档 等口径已成形。
- 像素办公室已真实接入，不再只是 mock 页面。
- 最近一轮继续向 edict 式更强后台骨架靠拢。
- 本轮新增：
  - `SESSION-STATE.md`，用于新会话恢复。
  - 在 Dashboard / Sessions 中补了“工作流阶段”可见语义：
    - 指令进入
    - 承办处理中
    - 待复核 / 待续办
    - 归档留痕
  - 在 Departments 中补了“当前环节 / 承办位置 / 下一步”显示。
  - 在 Dashboard 中新增“事项流转总览 / 当前主链路”，让首页开始围绕任务流而不是只围绕静态指标。
  - 在 Office 中新增“当前焦点席位”任务板，并把席位卡片补上承办位置提示，开始建立 Office → Sessions / Departments 的更直接联动。

## What Is Still Missing
1. **把多代理协作链路做真**
   - 承办
   - 复核
   - 回退
   - 升级
   - 再审
   - 跨机构接力
   当前仍偏“有展示”，但还不够像真实制度系统。

2. **让任务流成为产品主线**
   需要更清楚显示：
   - 指令从哪来
   - 谁先审
   - 谁承办
   - 谁卡住
   - 谁回报
   - 最终如何结案

3. **继续统一中层页面**
   仍需继续收口：
   - System Health
   - Token Stats
   - Channels
   - Logs
   - Search
   - Cron
   避免“主页面像新产品，次页面像旧后台”。

4. **补更明确的制度化页面/组件**
   下一步应考虑引入明确的：
   - 任务阶段条
   - 审批 / 复核状态卡
   - 跨机构 handoff 轨迹
   - 事项结案摘要区

## Recommended Next Step
优先继续做“只改皮，不丢骨”的下一刀：

### Next Slice
把 `Office / Sessions / Dashboard / Departments` 继续围绕同一条**事项主线**再收紧一轮：
- 在 Office 中补更明确的席位聚焦与任务联动
- 在 Sessions 中继续增强任务摘要、回退/复核/结案语义
- 在 Dashboard 中继续从“主链路”走向更完整的事项看板
- 视情况抽一个轻量可复用的任务流程组件，供多页共享

## Red Line
可以继续现代化，但不要把项目做成普通监控后台；核心必须仍然是：
**多代理协作系统，而不是几个页面在展示状态数据。**
