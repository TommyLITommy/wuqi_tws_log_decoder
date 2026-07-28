# TWS Log Decoder — TypeScript 知识点梳理

结合本仓库真实代码，整理项目里用到的 TypeScript 知识点。适合边读源码边对照学习，不是通用 TS 教程。

相关配置：`tsconfig.app.json`（`strict` 相关 lint、`verbatimModuleSyntax`、路径别名 `@/*`）。

---

## 目录

1. [基础类型与字面量联合](#1-基础类型与字面量联合)
2. [interface vs type](#2-interface-vs-type)
3. [可选属性与可空类型](#3-可选属性与可空类型)
4. [对象索引：Record 与索引签名思维](#4-对象索引record-与索引签名思维)
5. [索引访问类型（Indexed Access）](#5-索引访问类型indexed-access)
6. [keyof 与对象键安全更新](#6-keyof-与对象键安全更新)
7. [函数类型与方法签名](#7-函数类型与方法签名)
8. [类型断言 `as`](#8-类型断言-as)
9. [`as const` 与只读字面量](#9-as-const-与只读字面量)
10. [泛型（React / 工具函数）](#10-泛型react--工具函数)
11. [DOM / 浏览器 API 类型](#11-dom--浏览器-api-类型)
12. [React + TypeScript 模式](#12-react--typescript-模式)
13. [import type 与模块语法](#13-import-type-与模块语法)
14. [bigint](#14-bigint)
15. [正则与匹配结果类型](#15-正则与匹配结果类型)
16. [窄化（Narrowing）](#16-窄化narrowing)
17. [路径别名与工程配置](#17-路径别名与工程配置)
18. [学习路线建议](#18-学习路线建议)

---

## 1. 基础类型与字面量联合

项目大量用 **string 字面量联合** 表达有限状态，而不是随便写 `string`：

```typescript
// src/types/index.ts
export type LinkState =
  | 'unknown' | 'bt_off' | 'idle' | 'pairing' | 'connectable' | 'connected';

export type ProfileState = 'unknown' | 'disconnected' | 'connected' | 'streaming';
export type TwsRoleState = 'unknown' | 'master' | 'slave';
```

徽章类型同样是联合：

```typescript
badge: 'hci' | 'iap2' | 'rpc' | 'status' | 'appcmd' | 'btn' | 'appmsg' | 'state' | 'a2dp' | 'profile';
```

**为什么这样做**

- 赋值非法字符串会在编译期报错
- `switch` / `Record<LinkState, string>` 可做穷尽检查（见下文 Record）
- 比 `enum` 更轻量，本项目几乎不用 `enum`（配置里还有 `erasableSyntaxOnly`，更倾向可擦除语法）

核类型也是字面量联合：

```typescript
// src/share/logCore.ts
export type LogCore = 'A' | 'B' | 'D';
```

---

## 2. interface vs type

本仓库约定大致是：

| 用法 | 选择 | 例子 |
|------|------|------|
| 对象形状（实体 / Props / 快照） | `interface` | `LogEntry`、`DeviceStatusSnapshot`、`ToolbarProps` |
| 联合、别名、派生键名 | `type` | `LinkState`、`StatusFieldKey`、`LogCore` |

```typescript
// 实体
export interface LogEntry {
  id: number;
  raw: string;
  decoded: DecodedResult | null;
}

// 联合别名
export type StatusFieldKey = 'multipoint' | 'phoneCount' | /* ... */ | 'lastEvent';
```

插件契约也用 interface 描述「必须实现的形状」：

```typescript
export interface LogParser {
  name: string;
  pattern: RegExp;
  parse(match: RegExpMatchArray, line: string): ParseResult | null;
}
```

---

## 3. 可选属性与可空类型

### 可选 `?`：字段可以不存在

```typescript
export interface ParseResult {
  badge: string;
  rawValue: string;
  name: string;
  desc: string;
  severity?: 'info' | 'warning' | 'error' | 'success'; // 可省略
}
```

### `| null`：字段存在，但可能是空值

```typescript
decoded: DecodedResult | null;
battery: BatteryInfo | null;
inBox: boolean | null;          // 三态：未知 / 是 / 否
sourceLines: { a2dp: number | null; /* ... */ };
```

**区分记忆**

- `severity?` → 解析器可以不返回这个字段
- `battery: BatteryInfo | null` → 快照里一定有这个键，只是「尚未从日志学到」时为 `null`

组件里常见可选回调：

```typescript
onNavigateToLine?: (lineIndex: number) => void;
scrollTop?: number;
onScroll?: (scrollTop: number) => void;
```

---

## 4. 对象索引：Record 与索引签名思维

`Record<K, V>` =「键是 K、值是 V 的对象」。

### 码表 / 映射表

```typescript
export const A2DP_APPL_EVENT_MAP: Record<number, string> = {
  0x01: 'A2DP_CONNECT_CNF',
  0x09: 'A2DP_CONFIGURE_IND',
  // ...
};
```

### 以联合类型为键 → 强迫补全所有分支

```typescript
const map: Record<LinkState, string> = {
  unknown: '未知',
  bt_off: '蓝牙关',
  idle: '空闲',
  pairing: '配对中',
  connectable: '可连接',
  connected: '已连接',
};
// 少写一个 LinkState，TS 会报错
```

### 动态手机索引

```typescript
connectedDevices: Record<number, ConnectedDeviceInfo>;
```

缩略图徽章优先级：

```typescript
const BADGE_PRIORITY: Record<DecodedResult['badge'], number> = {
  iap2: 10,
  state: 9,
  // ... 必须覆盖 badge 联合的每一个成员
};
```

---

## 5. 索引访问类型（Indexed Access）

用 `Type['key']` 取出某字段的类型，避免重复定义：

```typescript
// 取出 DecodedResult.badge 的联合类型
Record<DecodedResult['badge'], number>

// adapter 里断言到同一类型
badge: parseResult.badge as DecodedResult['badge']
```

`ParseResult.badge` 是宽类型 `string`（方便各解析器随意写），展示层 `DecodedResult.badge` 是窄联合；转换时用索引访问类型引用「权威定义」。

---

## 6. keyof 与对象键安全更新

```typescript
export interface CoreFilter {
  showAcore: boolean;
  showBcore: boolean;
  showDcore: boolean;
}

// 只能传 'showAcore' | 'showBcore' | 'showDcore'
onCoreFilterChange: (key: keyof CoreFilter, value: boolean) => void;

const updateCoreFilter = useCallback((key: keyof CoreFilter, value: boolean) => {
  setCoreFilter(prev => ({ ...prev, [key]: value }));
}, []);
```

设备信息字段比较：

```typescript
field: keyof ConnectedDeviceInfo  // 'name' | 'address'
```

**要点**：`keyof` 把「字符串魔法值」变成类型约束的键名。

---

## 7. 函数类型与方法签名

### 接口里的方法

```typescript
parse(match: RegExpMatchArray, line: string): ParseResult | null;
```

### Props 里的回调

```typescript
onLoadFile: (file: File) => void;
onFilterChange: (text: string) => void;
renderItem: (index: number) => React.ReactNode;
```

### 返回「带方法的对象」（Handle）

```typescript
export interface LogPanelHandle {
  scrollTo: (scrollTop: number) => void;
  getScrollInfo: () => {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  };
}
```

父组件通过 `ref` 调用子组件方法（见第 12 节 `forwardRef` / `useImperativeHandle`）。

---

## 8. 类型断言 `as`

运行时已知、编译器推不出来时使用（要克制）：

```typescript
// 正则捕获组 → 字面量联合
match[1].toUpperCase() as 'A' | 'B' | 'D'
match[1].toUpperCase() as LogCore

// FileReader 结果
const chunk = e.target?.result as string;

// 宽 string → 窄 badge
parseResult.badge as DecodedResult['badge']

// 扩展 Document（非标准 API）
const doc = document as Document & { /* ... */ };
```

**原则**：能靠窄化（`if` / `instanceof`）解决就别 `as`；断言等于「我向编译器保证」。

非空断言 `!` 在入口也有：

```typescript
document.getElementById('root')!  // 确信 HTML 里有 #root
```

---

## 9. `as const` 与只读字面量

```typescript
// src/share/tdsProfileFlag.ts
} as const;
```

`as const` 会把对象属性推断成**最窄字面量**，并变为 `readonly`。适合「常量配置表」，避免被拓宽成 `string` / `number`。

配合 `Record` / 派生类型时特别有用（本仓库部分码表用普通 `Record<number, string>`，部分用 `as const`）。

---

## 10. 泛型（React / 工具函数）

本项目泛型主要出现在 React API，而不是大量手写 `function foo<T>`：

```typescript
// 双类型参数：Handle 类型 + Props 类型
forwardRef<LogPanelHandle, LogPanelProps>(...)
forwardRef<VirtualListHandle, VirtualListProps>(...)

// useRef 的泛型 = 保存值的类型
useRef<LogPanelHandle>(null)
useRef<HTMLInputElement>(null)
useRef<HTMLDivElement | null>(null)
useRef<{ type: 'left' | 'thumb' | null }>({ type: null })

useState<LogEntry[]>([])
useState<PanelSizes>(initial)
```

`Record<K, V>`、`Partial` 等本身也是内置泛型工具类型；本仓库最常用的是 `Record`。

---

## 11. DOM / 浏览器 API 类型

`tsconfig` 的 `"lib": ["ES2023", "DOM"]` 提供这些类型：

| 类型 | 出现位置 | 用途 |
|------|----------|------|
| `HTMLInputElement` | Toolbar 文件选择 | `useRef` / `ChangeEvent` |
| `HTMLDivElement` | 面板容器 ref | 尺寸、滚动 |
| `HTMLElement` / `SVGElement` | DebugOutline | `instanceof` 窄化 |
| `MouseEvent` / `PointerEvent` | 拖拽、检视 | 原生事件 |
| `React.MouseEvent` / `ChangeEvent` / `KeyboardEvent` | 组件内 | React 合成事件 |
| `DOMRect` | DebugOutline | `getBoundingClientRect()` |
| `File` / `FileReader` | useLogData | 读日志文件 |
| `RegExp` / `RegExpMatchArray` / `RegExpExecArray` | 全项目 | 日志匹配 |
| `ReactNode` | DebugOutline / VirtualList | children、render 返回值 |

```typescript
function parseTailwindClasses(el: Element): string[] {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return [];
  // 此处 el 已被窄化为 HTMLElement | SVGElement
}
```

注意区分：

- **原生** `MouseEvent`：`document.addEventListener('mousemove', ...)`
- **React** `React.MouseEvent`：JSX `onClick={(e) => ...}`

---

## 12. React + TypeScript 模式

### 12.1 Props interface

```typescript
interface ToolbarProps {
  fileName: string;
  coreFilter: CoreFilter;
  onCoreFilterChange: (key: keyof CoreFilter, value: boolean) => void;
  // ...
}

export default function Toolbar({ ... }: ToolbarProps) { ... }
```

### 12.2 forwardRef + useImperativeHandle

子组件向父暴露「命令式 API」：

```typescript
const LogPanel = forwardRef<LogPanelHandle, LogPanelProps>(
  (props, ref) => {
    useImperativeHandle(ref, () => ({
      scrollTo: (top) => listRef.current?.scrollTo(top),
      getScrollInfo: () => listRef.current?.getScrollInfo() ?? { ... },
    }));
    // ...
  }
);

LogPanel.displayName = 'LogPanel'; // DevTools 显示名；forwardRef 组件建议设置
```

父侧：

```typescript
const leftPanelRef = useRef<LogPanelHandle>(null);
leftPanelRef.current?.scrollTo(targetScroll);
```

### 12.3 Context 类型

```typescript
interface DebugOutlineContextValue {
  enabled: boolean;
  toggle: () => void;
}

const DebugOutlineContext = createContext<DebugOutlineContextValue>({
  enabled: false,
  toggle: () => {},
});
```

### 12.4 children 类型

```typescript
export function DebugOutlineProvider({ children }: { children: ReactNode }) {
```

### 12.5 事件与 tone 联合

```typescript
tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASS: Record<NonNullable<StatusItemProps['tone']>, string> = {
  default: '...',
  success: '...',
  // ...
};
```

`NonNullable<T>`：去掉 `null | undefined`，因为 `tone?` 可选，但作为 Record 键时要「确定存在的联合」。

### 12.6 Hook 返回值靠推断

```typescript
export function usePanelResize(initial: PanelSizes = { ... }) {
  // ...
  return { sizes, containerRef, startResizeLeft, startResizeThumb };
}
// 调用方自动获得返回类型，通常不必手写 ReturnType
```

---

## 13. import type 与模块语法

项目开启了 `verbatimModuleSyntax`，**类型导入必须用 `import type`**（或内联 `import { type X }`），否则可能报错「类型不能作为值导入」。

```typescript
import type { LogEntry, DecodedResult, StatusCheckpoint } from '@/types';
import type { LogPanelHandle } from '@/components/LogPanel';
import type { KeyboardEvent } from 'react';
import { Fragment } from 'react';
import { type ReactNode, useState } from 'react'; // 值与类型混写
```

**好处**：类型在编译后被擦除，不会进运行时打包；语义也更清晰。

导出类型：

```typescript
export type LinkState = ...;
export interface LogEntry { ... }
export type { CoreFilter }; // 若需要从 hook 文件再导出
```

`CoreFilter` 定义在 `useLogData.ts` 再被 Toolbar `import type`，说明类型可以放在业务模块，不一定全进 `types/index.ts`。

---

## 14. bigint

功能资源位图可能超过 `Number.MAX_SAFE_INTEGER`，用 `bigint`：

```typescript
export interface FeatResInfo {
  usr: bigint;
  msk: bigint;
  // ...
}

function parseHexBigInt(hex: string): bigint {
  return BigInt(hex); // '0x...' 字符串
}
```

注意：`bigint` 不能和 `number` 混运算；序列化/展示时常用 `.toString(16)`。

---

## 15. 正则与匹配结果类型

```typescript
pattern: RegExp;

parse(match: RegExpMatchArray, line: string): ParseResult | null;

let match: RegExpExecArray | null;
while ((match = RE.exec(raw)) !== null) { ... }
```

- `RegExpMatchArray`：`String.match` / 部分 `exec` 场景
- `RegExpExecArray`：带 `index` 的 exec 结果
- 捕获组 `match[1]` 类型是 `string | undefined`（严格模式下要注意），本项目常直接 `parseInt(match[1], 10)`，依赖「正则已匹配成功」的前提

---

## 16. 窄化（Narrowing）

```typescript
// null 检查
const info = extractMtu(line);
if (info === null) return null;

// 可选链 + 空值合并
return info?.address ?? '未知';
value ?? '未知'

// instanceof
if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return [];

// 真值窄化
if (!clickable) return;
onNavigate(sourceLine); // 此处 sourceLine 已被认为可用
```

`filter(Boolean)` 在 TS 里有时推不出窄化数组类型，本项目更多用显式 `=== null` 判断。

---

## 17. 路径别名与工程配置

```json
// tsconfig.app.json
"paths": { "@/*": ["./src/*"] }
"jsx": "react-jsx"
"moduleResolution": "bundler"
"verbatimModuleSyntax": true
"noUnusedLocals": true
"noUnusedParameters": true
"erasableSyntaxOnly": true
```

| 选项 | 对写代码的影响 |
|------|----------------|
| `@/` 别名 | `import x from '@/share/mtuLog'`，与 Vite `resolve.alias` 一致 |
| `verbatimModuleSyntax` | 必须 `import type` |
| `noUnusedLocals/Parameters` | 未使用变量/参数会报错 |
| `erasableSyntaxOnly` | 避免依赖运行时的 TS 专有语法（如部分 `enum` / `namespace` 写法） |
| `jsx: react-jsx` | 不必 `import React` 也能写 JSX |

根 `tsconfig.json` 用 **project references** 指向 `tsconfig.app.json` + `tsconfig.node.json`（Vite 配置文件单独一套）。

---

## 18. 学习路线建议

按本仓库阅读顺序学 TS：

```
① types/index.ts
   字面量联合、interface、| null、Record、可选字段

② parsers/registry.ts + 任意 *Parser.ts + adapter.ts
   接口实现形状、RegExpMatchArray、as 断言、import type

③ share/*Map.ts / *Log.ts
   Record 码表、返回 | null、bigint（featRes）、纯函数类型

④ hooks/useLogData.ts、usePanelResize.ts
   useState/useRef/useCallback 泛型、keyof、FileReader 断言

⑤ components/LogPanel / VirtualList / MainLayout
   Props、forwardRef、useImperativeHandle、React 事件类型

⑥ components/DebugOutline.tsx
   Context 类型、ReactNode、DOM 窄化、PointerEvent
```

### 对照速查

| 知识点 | 首选阅读文件 |
|--------|----------------|
| 字面量联合 / 领域模型 | `src/types/index.ts` |
| 插件接口 | `src/parsers/registry.ts`、`mtuParser.ts` |
| `Record` 穷尽映射 | `src/utils/statusSnapshot.ts`（format*）、`ThumbPanel.tsx` |
| `keyof` | `useLogData.ts`、`Toolbar.tsx` |
| `forwardRef` | `LogPanel.tsx`、`VirtualList.tsx` |
| `import type` | 任意组件顶部 |
| `bigint` | `featResLog.ts`、`FeatResInfo` |
| DOM + Context | `DebugOutline.tsx` |

---

## 附录：本项目「有意简化」之处

读官方高级手册时，可对照本仓库**较少使用**的特性：

| 较少出现 | 说明 |
|----------|------|
| `enum` | 多用字面量联合 |
| `class` | 解析器是对象字面量，不是 class |
| `namespace` / 装饰器 | 未使用 |
| 复杂条件类型 `infer` | 几乎没有 |
| `satisfies` | 未系统性使用 |
| 泛型约束 `T extends ...` 手写工具函数 | 主要靠 React 内置泛型 |

把上面「基础 + React 模式 + Record/keyof」吃透，就足够理解和扩展本项目的绝大多数代码。

---

## 相关文档

| 文档 | 内容 |
|------|------|
| [`codebase-analysis.md`](./codebase-analysis.md) | 架构与新手阅读路线 |
| [`debug-outline.md`](./debug-outline.md) | 调试边框功能实现 |
| [`app_bt_enter_ag_pairing.md`](./app_bt_enter_ag_pairing.md) | 业务日志分析 |
