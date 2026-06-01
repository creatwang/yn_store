# HTML 原生组件规范（商城 C 端）

> 来源：[blog.yanan.store — HTML 现代标签](https://blog.yanan.store/01javascript/12html-tag/)  
> 原则：**优先使用本文档列出的原生标签**，少用裸 `div`/`span` 替代语义元素；利于 **SEO、可访问性、零/低 JS**。

---

## 0. 团队强制优先级

1. **语义 HTML 原生标签**（本文档清单）> 无意义 `div`/`span`
2. **HTML5 增强**（`<dialog>`、`<details>`）> 框架弹窗/折叠
3. **原生 `<script>` 标准岛** > Preact（见 [islands-strategy.md](islands-strategy.md)）
4. 需要动态数据时：仍用原生标签作**壳**（如 `<output>` 展示价），JS 只负责更新内容

**禁止**：用 `<span id="price">` 代替 `<output>` 展示 SKU 价；用 `<div onclick>` 代替 `<button>`。

---

## 1. 组件清单与商城场景

| # | 标签 | SEO / 语义 | 商城使用场景 | 优先级 |
|---|------|------------|--------------|--------|
| 1 | `<time datetime>` | 机器可读时间 | 订单时间、促销截止、预计发货 | 高 |
| 2 | **`<output>`** | 计算/派生结果 | **SKU 切换价格**、小计、运费合计、折扣后价 | **必用** |
| 3 | `<datalist>` | 输入建议 | 国家/城市、优惠券码、搜索联想 | 中 |
| 4 | `<meter>` | 有界度量 | 库存紧张比例、限时名额、评分 | 中 |
| 5 | `<progress>` | 任务进度 | 上传定制图、checkout 步骤、支付处理中 | 中 |
| 6 | `<abbr title>` | 缩写释义 | GSM、SKU、COD 等专业词 | 低 |
| 7 | `<mark>` | 语境高亮 | 促销文案、搜索关键词高亮 | 低 |
| 8 | `<wbr>` | 断行点 | 长 SKU、长 handle、长域名 | 低 |
| 9 | **`<fieldset>` + `<legend>`** | 表单分组 | **规格/数量/地址/支付**分组 | **必用** |
| 10 | `<optgroup>` | 选项分类 | 规格下拉（按颜色/尺码分组） | 中 |
| 11 | `<bdi>` | 双向文本 | 用户昵称、阿拉伯/希伯来语买家名 | 低 |
| 12 | `<kbd>` | 快捷键 | 帮助页、后台说明（C 端少用） | 低 |
| 13 | `<address>` | 联系信息 | **页脚**客服邮箱、官网（非普通地址排版） | 高 |
| — | `<dialog>` | 模态 | 快速预览、促销弹窗、确认删除（见 islands-strategy） | 高 |
| — | `<details>` + `<summary>` | 折叠 | 商品参数、FAQ、配送说明 | 高 |
| — | `enterkeyhint` | 移动端键盘 | 搜索 `search`、结算 `done`、步骤 `next` | 中 |
| — | `autocomplete` | 自动填充 | checkout 姓名/地址/卡号 `cc-number` 等 | 高 |

---

## 2. 重点：`output` + SKU 价格（已落地）

### 为什么不用 `<span>`

- `<output>` 语义为「表单派生结果」，爬虫与读屏更易理解「这是随选择变化的价」
- 可 `for` 关联 `select`/`input` id，结构清晰

### 项目实现

`apps/storefront/src/components/product/ProductAddToCart.astro`：

- 价格：`<output id="variant-price" for="variant-select qty-input">`
- 规格/数量：`<fieldset>` + `<legend>`
- SKU 切换：`change` 事件更新 `output.textContent`（最小 JS）

### 模板

```astro
<form id="add-to-cart-form" class="mt-8">
  <p class="text-2xl font-bold text-gray-900">
    <span class="sr-only">当前价格</span>
    $<output id="variant-price" name="price" for="variant-select">
      {initialPrice}
    </output>
  </p>
  <fieldset class="mt-4 space-y-3 rounded border border-gray-200 p-4">
    <legend class="px-1 text-sm font-medium">购买选项</legend>
    <label for="variant-select" class="block text-sm">规格</label>
    <select id="variant-select" name="variant" class="w-full rounded border px-3 py-2">
      <!-- option + data-price -->
    </select>
    <label for="qty-input" class="block text-sm">数量</label>
    <input id="qty-input" name="quantity" type="number" min="1" value="1"
      inputmode="numeric" enterkeyhint="done" class="w-24 rounded border px-3 py-2" />
  </fieldset>
  <button type="button" id="add-to-cart" class="mt-4 ...">加入购物车</button>
  <p id="cart-msg" role="status" aria-live="polite" class="mt-2 text-sm"></p>
</form>
```

---

## 3. 页面 × 推荐原生组件

| 页面 | 推荐组件 |
|------|----------|
| PDP 详情 | `<article>`、`<output>` 价、`<fieldset>` 规格、`<details>` 参数/FAQ、`<meter>` 库存 |
| 列表/促销 | `<mark>` 促销、`<time>` 截止 |
| 购物车 | `<output>` 小计、`<fieldset>` 明细 |
| checkout | `<fieldset>` 联系/配送/支付、`autocomplete`、`progress` 步骤 |
| 账户/订单 | `<time datetime>` 下单时间 |
| 全站 Footer | `<address>` |
| 搜索 | `<datalist>` + `enterkeyhint="search"` |

---

## 4. 输入增强属性（checkout 必看）

```html
<input type="text" name="email" autocomplete="email" enterkeyhint="next" />
<input type="text" name="cc-number" autocomplete="cc-number" />
<input type="text" name="cc-exp" autocomplete="cc-exp" />
<input type="search" enterkeyhint="search" />
```

---

## 5. 反模式

| ❌ 不要 | ✅ 改用 |
|--------|--------|
| `<div class="price">` | `<output>` |
| `<div class="footer-contact">` | `<address>` |
| `<span>` 包促销截止 | `<time datetime="...">` |
| 无分组的一堆 label | `<fieldset>` + `<legend>` |
| 自定义 div 折叠 | `<details>` / `<dialog>` |
| 文档里写裸 `<base>` 示例 | 用代码块或转义，防误解析 |

---

## 6. 与 Astro 的关系

- 以上标签均在 **`.astro` 模板中直接写 HTML**，SSR/SSG 输出即语义 DOM，**利于 SEO**
- 交互仍用组件内 `<script>` 更新 `output`、打开 `dialog`，无需 UI 框架
- 动态价/库存注水：SSG 写初始值进 `<output>`，客户端 script 刷新（与 hybrid 注水一致）

---

## 7. 验收清单（Code Review）

- [ ] PDP 价格是否为 `<output>` 且关联 SKU `select` id
- [ ] 表单是否用 `<fieldset>`/`<legend>` 分组
- [ ] Footer 联系信息是否 `<address>`
- [ ] 促销/订单时间是否 `<time datetime>`
- [ ] 参数/FAQ 是否 `<details>` 而非纯 JS 折叠
- [ ] checkout 是否 `autocomplete` / `enterkeyhint`
- [ ] 是否避免用 `div/span` 承担 button/link/price 语义

---

## 8. 参考链接

- 原文整理：https://blog.yanan.store/01javascript/12html-tag/
- MDN HTML 元素参考：https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element
- 项目 UI 岛策略：[islands-strategy.md](islands-strategy.md)
