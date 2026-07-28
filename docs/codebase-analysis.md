# TWS Log Decoder — 代码仓库梳理

面向新手的仓库导读：技术栈、入口、架构、阅读路线，以及如何扩展功能。

---

## 1. 项目是做什么的

**TWS Log Decoder** 是浏览器端的 TWS（True Wireless Stereo）蓝牙调试日志分析工具。

典型用法：

1. 打开一份 `.log` / `.txt` / `.csv` 日志
2. 左侧看原始行，中间看协议解码，右侧用缩略图导航
3. 顶部状态栏根据当前滚动位置，还原当时的连接 / A2DP / HFP / 电量 / RSSI / MTU 等设备状态

单页应用（SPA），无后端、无路由。

---

## 2. 技术栈

| 类别 | 技术 | 版本（约） | 用途 |
|------|------|------------|------|
| UI 框架 | React | 19 | 组件与状态 |
| 语言 | TypeScript | 6 | 类型安全 |
| 构建 | Vite | 8 | 开发服务器 / 打包 |
| UI 库 | Ant Design | 6 | 少量控件（如 App 容器、消息） |
| 样式 | Tailwind CSS | 4 | 布局与主题（`@tailwindcss/vite`） |
| Lint | ESLint + typescript-eslint | — | 代码检查 |

**路径别名**：`@` → `src/`（见 `vite.config.ts`）

**常用命令**：

```bash
npm install
npm run dev      # http://127.0.0.1:8080
npm run build    # tsc -b && vite build
npm run preview  # 预览生产构建
npm run lint
```

---

## 3. 入口与启动链路

```
index.html
  └─ <script type="module" src="/src/main.tsx">
       └─ createRoot(#root).render(<App />)
            └─ App.tsx
                 ├─ useLogData()      // 数据：加载 / 解析 / 过滤 / 快照
                 ├─ usePanelResize() // UI：三栏宽度拖拽
                 ├─ Toolbar
                 └─ MainLayout
                      ├─ StatusPanel
                      ├─ LogPanel | DecodePanel | ThumbPanel
                      └─ Resizer
```

| 文件 | 作用 |
|------|------|
| `index.html` | HTML 壳，挂载 `#root` |
| `src/main.tsx` | React 入口，引入全局样式 `index.css` |
| `src/App.tsx` | 组合 Hook + 工具栏 + 主布局，是业务总装配点 |

读代码时，先从 `App.tsx` 看 props 往下传了什么，再分别进 Hook 与组件。

---

## 4. 目录结构（按层）

```
src/
├── components/     # UI：工具栏、三栏布局、状态条、虚拟列表
├── hooks/          # 业务状态：日志数据、面板尺寸
├── parsers/        # 协议解码器 + registry（插件注册表）
├── share/          # 正则、枚举映射、applyXxxLog（状态更新）
├── utils/          # 常量、格式化、状态快照系统
├── types/          # 全局 TypeScript 类型
├── App.tsx
├── main.tsx
└── index.css       # Tailwind + 主题变量
```

分层约定（扩展功能时务必遵守）：

| 层 | 职责 | 不要做 |
|----|------|--------|
| `share/` | 识别日志、提取字段、更新 snapshot | 不碰 React |
| `parsers/` | 把一行变成 UI 用的 `ParseResult` | 不写复杂业务状态机 |
| `utils/statusSnapshot.ts` | 把多行日志累积成设备状态 | 不写具体正则细节（委托 share） |
| `components/` | 展示与交互 | 不直接解析原始协议码表 |
| `hooks/` | 文件 I/O、过滤、选中行 | 不写具体协议 decode |

---

## 5. 架构概览

### 5.1 页面布局

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar：打开文件 / 搜索 / Acore·Bcore·Dcore / 统计      │
├─────────────────────────────────────────────────────────┤
│ StatusPanel：截止 Lxxx 的实时设备状态（可点击跳转）        │
├──────────────┬──────────────────┬───────────────────────┤
│ LogPanel     │ DecodePanel      │ ThumbPanel            │
│ 原始日志     │ 协议解码结果      │ 缩略导航 / 命中标记     │
│ (虚拟列表)   │ (虚拟列表)        │                       │
└──────────────┴──────────────────┴───────────────────────┘
```

三栏可拖拽；左右列表滚动同步；右侧缩略图可快速跳转。

### 5.2 核心数据流

```
选文件
  → FileReader 按 1MB 分块读
  → 按行 split
  → 每行：parseLogLine() → toDecodedResult() → LogEntry
  → buildStatusCheckpoints() 生成状态检查点
  → allLogs / filteredIndices / statusCheckpoints
  → 组件渲染
```

过滤时只维护 **行索引** `filteredIndices`，不复制整份日志，省内存。

### 5.3 解析器插件（Registry）

```
parsers/registry.ts
  parserRegistry: LogParser[]   // 有序；第一个匹配成功即返回
  parseLogLine(line)            // 对外统一入口
```

接口：

```typescript
interface LogParser {
  name: string;
  pattern: RegExp;
  parse(match: RegExpMatchArray, line: string): ParseResult | null;
}
```

`adapter.ts` 把 `ParseResult` 转成 UI 用的 `DecodedResult`（补 `hexValue`、`matchText`）。

当前注册顺序（先到先得）：

RPC → HCI → A2DP 状态/事件 → HFP 状态/事件 → AVRCP → Profile 连接 →  
CPU / Mem / FeatRes / Traffic / Battery / LinkKey / MTU →  
充电盒 / WWS RSSI / 主从切换 → 状态码 / APP 命令 / 按键 / APP 消息 / SysState

### 5.4 实时状态快照（Checkpoint）

文件：`utils/statusSnapshot.ts`

- `applyLine(snapshot, line, lineIndex)`：根据一行日志更新 `DeviceStatusSnapshot`
- 每约 500 行或状态变化时存一个 `StatusCheckpoint`
- 视口滚动时：`getStatusAtLine(...)` 从最近 checkpoint 正向追赶到当前行

这样任意滚动位置都能还原「当时」的连接、音量、电量、MTU 等，且无需每次从第 0 行全量重算。

状态字段示例：`linkState`、`a2dp`、`hfp`、`battery`、`wwsRssi`、`linkKey`、`mtu`、`cpuIdleA/B/D`、`sourceLines`（各字段来源行号，供点击跳转）。

### 5.5 性能要点

| 手段 | 位置 | 说明 |
|------|------|------|
| 虚拟列表 | `VirtualList.tsx` | 只渲染可视行 |
| 分块读文件 | `useLogData.ts` | 1MB/块，带进度 |
| 索引过滤 | `filteredIndices` | 过滤结果是索引数组 |
| Checkpoint | `statusSnapshot.ts` | 避免状态全量重算 |
| 滚动同步锁 | `MainLayout.tsx` | 防止左右互相触发死循环 |

---

## 6. 关键类型与概念

| 概念 | 含义 |
|------|------|
| `LogEntry` | `{ id, raw, decoded }` 一行日志 |
| `ParseResult` | 解析器输出：badge / name / desc / severity |
| `DecodedResult` | 适配后给面板展示的结构 |
| `DeviceStatusSnapshot` | 某一时刻的设备状态集合 |
| `StatusCheckpoint` | `{ lineIndex, snapshot }` 快照检查点 |
| `filteredIndices` | 过滤后可见行在 `allLogs` 中的下标 |
| `CoreFilter` | 是否显示 A / B / D 核日志 |
| `parserRegistry` | 有序解析器列表 |

类型定义集中在：`src/types/index.ts`。

---

## 7. 新手阅读学习路线图

建议按下面顺序读，每一步都带着「这一层解决什么问题」去看。

### Day 0 — 跑起来

1. `npm install` → `npm run dev`
2. 打开一份真实 TWS 日志，点选几行，观察三栏与顶部状态是否联动
3. 试一下搜索：`关键词`、`a|b`、`/正则/`，以及 Acore/Bcore/Dcore 勾选

### Day 1 — 入口与 UI 骨架（约 1–2h）

```
index.html → main.tsx → App.tsx
  → Toolbar.tsx（文件 / 过滤入口）
  → MainLayout.tsx（三栏 + 滚动同步）
  → LogPanel / DecodePanel / ThumbPanel / StatusPanel
```

目标：能画出「数据从 App 传到哪个面板」。

### Day 2 — 数据层（约 2–3h）

精读 `hooks/useLogData.ts`：

- `loadFile`：分块读、组 `LogEntry[]`、建 checkpoint
- `filterLogs` / Core 过滤：如何得到 `filteredIndices`
- `selectRow`：选中行如何驱动跳转

顺带扫一眼 `utils/constants.ts`（行高等常量）。

### Day 3 — 解析器体系（约 2–3h，最重要）

```
types/index.ts          # LogParser / ParseResult
parsers/registry.ts     # 注册与 parseLogLine
parsers/adapter.ts      # → DecodedResult
parsers/batteryParser.ts 或 mtuParser.ts   # 简单范例
share/batteryLog.ts 或 mtuLog.ts           # 正则 + extract
```

练习：在控制台或临时脚本里对一行样例日志调用 `parseLogLine`，看返回结构。

再挑一个稍复杂的：`a2dpApplEventParser` + `a2dpApplEventMap`（枚举映射）。

### Day 4 — 实时状态系统（约 2–3h）

```
utils/statusSnapshot.ts
  createEmptySnapshot / applyLine / buildStatusCheckpoints / getStatusAtLine
share/*Log.ts           # applyXxxLog 如何改 snapshot
components/StatusPanel.tsx
```

练习：对照一行 `gatt mtu changed to 672`，跟踪 `mtu` 如何从 0 变为 672，并出现在状态栏。

### Day 5 — 协议映射与扩展实战（约半天）

浏览 `share/` 里的码表：`hciCodes`、`rpcTables`、`hfpStateMap`、`a2dpStateMap` 等。

按「常见修改场景」自己加一个最小解析器（见下一节），走通：

`share` → `parsers` → `registry`（可选再接 `statusSnapshot` + `StatusPanel`）。

### 进阶（按需）

- `VirtualList.tsx`：虚拟滚动实现
- `ThumbPanel.tsx`：缩略命中与跳转
- `docs/app_bt_enter_ag_pairing.md`：业务侧配对流程笔记（结合固件日志）

---

## 8. 常见扩展场景（改哪里）

### 8.1 只做「日志行解码」（中间栏高亮）

1. `src/share/xxxLog.ts`：写正则 + `extractXxx`
2. `src/parsers/xxxParser.ts`：实现 `LogParser`
3. `src/parsers/registry.ts`：注册（注意顺序，避免被更宽的正则抢匹配）

参考：`mtuParser` / `linkKeyParser` / `a2dpApplEventParser`

### 8.2 再加「实时状态栏」

在 8.1 基础上：

1. `types/index.ts`：给 `DeviceStatusSnapshot`、`StatusSourceLines`、`StatusFieldKey` 加字段
2. `share/xxxLog.ts`：实现 `applyXxxLog(snapshot, raw)`
3. `utils/statusSnapshot.ts`：空快照、`trackSourceLines`、`applyLine` 调用、`snapshotChanged`
4. `components/StatusPanel.tsx`：展示 + `sourceLine` 跳转  
   （格式化函数建议从 `share` 直接 import，避免 HMR 重导出不同步）

参考：MTU、Link Key、Battery 整条链路。

### 8.3 只改 UI / 搜索

| 需求 | 文件 |
|------|------|
| 布局与同步滚动 | `MainLayout.tsx` |
| 搜索正则逻辑 | `useLogData.ts` → `buildFilterRegex` |
| 主题颜色 | `src/index.css` |

---

## 9. 模块依赖关系（简图）

```
App
├── useLogData
│   ├── parsers/registry → parsers/* → share/*
│   ├── parsers/adapter
│   └── utils/statusSnapshot → share/*Log
├── usePanelResize
└── components
    ├── Toolbar
    └── MainLayout
        ├── StatusPanel ← statusSnapshot + share 格式化
        ├── LogPanel / DecodePanel ← VirtualList
        ├── ThumbPanel
        └── Resizer
```

依赖方向应保持：**UI → hooks/utils → parsers → share → types**。  
不要让 `share` 依赖 React 组件。

---

## 10. 调试小技巧

1. 加载断点：在 `useLogData.loadFile` 看 `parsedLogs` / `statusCheckpoints`
2. 单行解码：对样例字符串调用 `parseLogLine(line)`
3. 状态栏：在 `StatusPanel` 打印 `snapshot` / `sourceLines`
4. 性能：React DevTools Profiler + 大文件测虚拟列表是否掉帧

---

## 11. 设计原则（记住这四条就够）

1. **解析器插件化**：新协议 = 新文件 + registry 一行注册  
2. **状态可追溯**：每个状态字段记住来源行，支持点击跳转  
3. **大文件友好**：分块读取 + 虚拟列表 + 索引过滤 + Checkpoint  
4. **单向数据流**：文件 → 解析 → 过滤 → 渲染，状态由日志推导，不反向写回文件  

---

## 12. 相关文档

| 文档 | 内容 |
|------|------|
| 本文 `docs/codebase-analysis.md` | 仓库架构与学习路线 |
| `docs/typescript-notes.md` | 本项目涉及的 TypeScript 知识点 |
| `docs/debug-outline.md` | 组件边框调试（悬浮 CSS 开关）实现思路 |
| `docs/app_bt_enter_ag_pairing.md` | 进入 AG 配对相关日志/流程分析 |
| `README.md` | Vite 模板说明（偏脚手架，业务以本文为准） |
