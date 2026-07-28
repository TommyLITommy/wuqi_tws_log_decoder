# 组件边框调试（Debug Outline）实现说明

悬浮 **CSS** 按钮：开启后给各组件加彩色边框以示区分；鼠标 hover 到任意带 class 的元素时，浮层展示其 Tailwind 属性。本文记录设计思路、文件职责与扩展方法，便于后续查阅。

---

## 1. 功能目标

| 能力 | 行为 |
|------|------|
| 悬浮开关 | 右下角固定按钮，点击开/关 |
| 组件边框 | 开启后，所有带 `data-debug-component` 的根节点显示彩色 outline + 角标名 |
| Hover 检视 | 青色高亮当前元素；浮层列出 `class` 中的 Tailwind utility |
| 状态持久化 | `localStorage` 记住开关，刷新后保持 |

---

## 2. 总体思路（为什么这样设计）

不做「给每个组件包一层 HOC、改 className」的侵入式方案，而是拆成两层：

```
┌─────────────────────────────────────────────────────────┐
│  标记层（静态）                                          │
│  各组件根节点加 data-debug-component="Xxx"               │
│  → CSS 在 .debug-outline-on 下统一画边框 / 角标           │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  检视层（动态）                                          │
│  DebugOutlineProvider 监听 pointermove                   │
│  → elementFromPoint → 解析 class → 覆盖层 + 浮层展示     │
└─────────────────────────────────────────────────────────┘
```

优点：

1. **边框与逻辑解耦**：开关只给 `<html>` 加/删 `debug-outline-on`，边框全靠 CSS
2. **组件改动极小**：根节点多一个 `data-*` 属性即可接入
3. **Hover 不污染业务 DOM**：高亮用 `position: fixed` 的覆盖层，不改被检视元素的 style
4. **调试 UI 自身可排除**：按钮/浮层带 `data-debug-ui`，避免自己检视自己

---

## 3. 关键文件

| 文件 | 职责 |
|------|------|
| `src/components/DebugOutline.tsx` | Provider、悬浮按钮、hover 覆盖层与 Tailwind 浮层 |
| `src/index.css` | `.debug-outline-on [data-debug-component]` 边框与各组件配色 |
| `src/App.tsx` | 用 `<DebugOutlineProvider>` 包裹应用；App 根加标记 |
| 各 `components/*.tsx` | 根节点增加 `data-debug-component="..."` |

---

## 4. 开关与全局模式

```
点击 CSS 按钮
  → setEnabled(!enabled)
  → localStorage['tws-debug-outline'] = '1' | '0'
  → useEffect: document.documentElement.classList.add/remove('debug-outline-on')
```

开启后整棵文档进入「调试模式」，CSS 选择器：

```css
.debug-outline-on [data-debug-component] {
  outline: 2px solid var(--debug-outline-color, #f59e0b);
  outline-offset: -2px;
  position: relative;
}

.debug-outline-on [data-debug-component]::after {
  content: attr(data-debug-component);  /* 角标显示组件名 */
  /* 绝对定位在左上角 */
}
```

不同组件用不同 `--debug-outline-color`（如 Toolbar 蓝、LogPanel 粉），方便肉眼区分层级。

---

## 5. 组件如何接入边框

在**组件最外层 DOM** 上标记：

```tsx
<div data-debug-component="Toolbar" className="h-12 bg-bg-secondary ...">
  ...
</div>
```

当前已标记：

| `data-debug-component` | 所在文件 |
|------------------------|----------|
| `App` | `App.tsx` |
| `Toolbar` | `Toolbar.tsx` |
| `MainLayout` | `MainLayout.tsx` |
| `PanelHeader` | `MainLayout.tsx`（表头行） |
| `ContentRow` | `MainLayout.tsx`（三栏内容行） |
| `StatusPanel` | `StatusPanel.tsx` |
| `LogPanel` | `LogPanel.tsx` |
| `DecodePanel` | `DecodePanel.tsx` |
| `ThumbPanel` | `ThumbPanel.tsx` |
| `Resizer` | `Resizer.tsx` |
| `VirtualList` | `VirtualList.tsx` |

新增组件时：

1. 根节点加 `data-debug-component="YourName"`
2. （可选）在 `index.css` 为该名字加一行配色

---

## 6. Hover 检视流程

```
pointermove
  → document.elementFromPoint(x, y)
  → 若落在 [data-debug-ui] 内 → 忽略（不检视调试 UI）
  → 若当前节点无 class，向上找最近带 class 的祖先
  → 解析 class 字符串 → string[]（过滤空串、debug-outline*）
  → closest('[data-debug-component]') 得到所属组件名
  → 用 getBoundingClientRect() 画青色覆盖框
  → 在光标旁画浮层：<tag> · ComponentName + class 芯片列表
```

浮层定位逻辑：默认在指针右下；若越出视口则翻到左/上，避免被裁切。

### 为什么用覆盖层而不是改 outline？

- 业务元素可能已有 `outline` / `border`（调试模式边框也在用 outline）
- 覆盖层与组件边框互不干扰，且可精确贴合 `getBoundingClientRect()`

### 为什么过滤 `data-debug-ui`？

悬浮按钮、高亮框、浮层都在调试层里。若不排除，hover 会一直命中浮层自身，形成抖动或空 class。

---

## 7. Context API（可选消费）

```tsx
import { useDebugOutline } from '@/components/DebugOutline';

const { enabled, toggle } = useDebugOutline();
```

一般业务组件**不需要**读这个 Context；边框完全靠 `data-*` + CSS。Context 留给「需要感知调试模式是否开启」的扩展点。

挂载方式（`App.tsx`）：

```tsx
<AntApp>
  <DebugOutlineProvider>
    <div data-debug-component="App" className="...">
      <Toolbar ... />
      <MainLayout ... />
    </div>
  </DebugOutlineProvider>
</AntApp>
```

---

## 8. 数据流简图

```
DebugOutlineProvider
├── enabled (state + localStorage)
├── hover (HoverInspect | null)
├── children（整棵应用）
├── 固定按钮 [data-debug-ui]  → toggle
└── enabled && hover 时
    ├── fixed 覆盖框（rect）
    └── fixed 浮层（tag / component / classes）

<html class="debug-outline-on">   ← enabled 时
  └── [data-debug-component]       ← CSS 画边框 + ::after 角标
```

`HoverInspect` 字段：

| 字段 | 含义 |
|------|------|
| `tag` | 元素标签名，如 `div` |
| `component` | 最近 `data-debug-component` 值 |
| `classes` | 拆分后的 Tailwind class 列表 |
| `rect` | 用于覆盖框定位 |
| `x` / `y` | 指针位置，用于浮层锚点 |

---

## 9. 与「组件树」的关系（学习要点）

本功能**不是** React DevTools，也不解析 Fiber：

- 边框粒度 = 你打了哪些 `data-debug-component`
- Hover 粒度 = DOM 上带 `class` 的任意节点（可细到一行里的某个 `span`）

因此：

- 想看**布局块边界** → 给布局根节点打标记即可
- 想看**某个子元素用了哪些 utility** → 开启后直接 hover，无需再打标记

这和仓库里「解析器插件化」类似：**标记即注册，CSS/检视器统一消费**。

---

## 10. 常见扩展

| 需求 | 做法 |
|------|------|
| 新组件也要边框 | 根节点加 `data-debug-component`，CSS 可选配色 |
| 关掉持久化 | 去掉 `localStorage` 读写即可 |
| 只在开发环境显示按钮 | `if (import.meta.env.DEV)` 再渲染 Provider / 按钮 |
| 浮层复制 class | 在浮层加「复制」按钮，`navigator.clipboard.writeText(classes.join(' '))` |
| 按类别分组 class | 在 `parseTailwindClasses` 后按前缀（`flex`/`text-`/`bg-`）分组展示 |
| 键盘快捷键 | 监听例如 `Ctrl+Shift+D` 调用 `toggle()` |

---

## 11. 注意点

1. **`position: relative`**：调试 CSS 会给带标记的节点设 `relative`，以便 `::after` 角标定位；若某节点布局依赖「非 relative」，需单独评估。
2. **Ant Design 组件**：Button/Input 等内部 class 可能是 antd 生成的，不一定是项目里的 Tailwind；浮层会如实显示当前 DOM 上的 class。
3. **性能**：`pointermove` 里做 `elementFromPoint` + `setState`，大数据列表滚动时一般可接受；若卡顿可加 `requestAnimationFrame` 节流。
4. **z-index**：调试 UI 使用 `z-[9998]` / `z-[9999]`，需高于业务面板。

---

## 12. 相关阅读

- 仓库架构总览：[`docs/codebase-analysis.md`](./codebase-analysis.md)
- 实现源码：`src/components/DebugOutline.tsx`
- 样式：`src/index.css` 中 `Debug outline mode` 一节
