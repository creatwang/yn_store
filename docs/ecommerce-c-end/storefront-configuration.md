# C 端商城配置说明（运营向）

> 面向店铺运营、实施与运维。说明 **顾客看到的商城（Storefront）** 如何从 Admin 后台配置语言、货币等，以及何时需要改 `.env`。
>
> 技术约定见 [storefront-conventions.md](./storefront-conventions.md)；部署见 [adapter-deployment.md](./adapter-deployment.md)。

---

## 1. 总体原则

| 配置项 | **优先在 Admin 配置** | `.env` 作用 |
|--------|----------------------|-------------|
| 可选语言（顶栏切换） | **设置 → 商店 → 语言** | 仅兜底 |
| 默认语言（访问 `/` 跳转） | **设置 → 商店 → 编辑 → 默认语言** | 仅兜底 |
| 结算货币（顶栏货币切换） | **设置 → 商店 → 货币** | 首次访问默认 + 兜底 |
| 地区 / 税率 / 支付 | **设置 → 地区** 等 | 不直接控制 C 端 UI |

C 端运行时通过 **`GET /api/store/locales`**、**`GET /api/store/currencies`** 读取与 Admin 一致的配置，**无需改代码或重启 storefront 即可生效**（有约 60 秒缓存）。

本地开发若改了 Admin 配置后 C 端未立刻变化，可 **硬刷新浏览器** 或等待约 1 分钟。

---

## 2. 语言配置（必读）

### 2.1 配置步骤

1. 登录 Admin → **设置 → 通用 → 商店**
2. 在 **语言** 区域点击 **添加**，勾选要面向顾客开放的语言（如 `zh-CN`、`en-US`），保存
3. 点击 **编辑商店**，在 **默认语言** 下拉中选择一项（选项来自上一步已添加的语言），保存
4. 打开 C 端商城验证：
   - 访问 `http://localhost:4321/` 应自动跳转到默认语言前缀（如 `/zh/` 或 `/en/`）
   - 顶栏显示语言切换按钮（**至少 2 种语言** 时才显示；只有 1 种时隐藏）

### 2.2 C 端行为说明

| 行为 | 说明 |
|------|------|
| URL 前缀 | 中文 `zh-CN` → `/zh/...`；英文 `en-US` → `/en/...` |
| 默认语言 | 未带语言前缀访问首页或商品列表时，重定向到 Admin 配置的默认语言 |
| 语言切换 | 顶栏按钮列表 = Admin「商店 → 语言」中已添加的语言 |
| 非法语言 URL | 访问未在商店启用的语言前缀时，自动跳回默认语言 |

### 2.3 与 Admin「翻译」功能的区别

| 功能 | 路径 | 作用 |
|------|------|------|
| **商店语言** | 设置 → 商店 → 语言 | 决定 **C 端** 展示哪些语言、默认哪一种 |
| **翻译管理** | 设置 → 翻译 | 决定 **Admin / 商品文案** 的多语言内容，不单独控制 C 端 URL |

两者常配合使用：先在商店添加语言，再在翻译里维护各语言文案。

### 2.4 环境变量（可选，兜底）

文件：`apps/storefront/.env`

```env
# Admin 未配置默认语言、或 /api/store/locales 不可用时使用
PUBLIC_DEFAULT_LOCALE=zh-CN

# 静态构建（ASTRO_OUTPUT=static）时强制预渲染的语言，逗号分隔
# 未设置时，构建会从 Admin 拉取商店语言列表
PUBLIC_SSG_LOCALES=zh-CN,en-US
```

**正常运营以 Admin 为准**，不必依赖上述变量。

---

## 3. 货币配置

### 3.1 配置步骤

1. Admin → **设置 → 商店 → 货币** → **添加货币**（如 USD、CNY、EUR、AUD）
2. **编辑商店** → 选择 **默认货币**（决定 Admin 侧默认结算货币）
3. C 端顶栏 **货币下拉** 显示的是 **商店已添加的货币**（与 Admin 货币列表一致，并结合地区信息生成选项）

### 3.2 C 端行为说明

| 行为 | 说明 |
|------|------|
| 首次访问 | 无 cookie 时使用 `PUBLIC_DEFAULT_CURRENCY`（若未设置则可能为 `usd`） |
| 用户切换 | 选择后写入 cookie / localStorage，下次访问保持 |
| 数据来源 | `GET /api/store/currencies` + 地区信息 |

### 3.3 环境变量（可选）

```env
PUBLIC_DEFAULT_CURRENCY=usd
```

---

## 4. 地区（与货币、结账相关）

C 端 **不** 在顶栏展示「地区」下拉；地区主要在 **结账、税费、支付渠道** 链路中使用。

运营侧建议：

1. **设置 → 地区**：按售卖国家/货币创建地区（如英国 GBP、美国 USD、澳大利亚 AUD）
2. **设置 → 商店 → 编辑**：设置 **默认地区**（影响后台默认上下文）
3. 地区名称建议带货币后缀（如 `Australia (AUD)`），避免在 Admin 下拉中与同名地区混淆

详见 [ADMIN-USER-GUIDE.md](../ADMIN-USER-GUIDE.md) 中「设置：商店与货币」「设置：地区与支付渠道」。

---

## 5. 本地联调检查清单

| 步骤 | 命令 / 地址 |
|------|-------------|
| 启动 API | `pnpm dev --filter=@my-store/server`（默认 `http://localhost:7000`） |
| 启动 C 端 | `pnpm dev --filter=@my-store/storefront`（默认 `http://localhost:4321`） |
| 确认 API 可访问 | `GET http://localhost:7000/api/store/locales` |
| 确认返回内容 | 含 `locales[]` 与 `default_locale_code` |
| 确认 C 端 env | `apps/storefront/.env` 中 `PUBLIC_API_URL=http://localhost:7000` |

**示例响应**（`/api/store/locales`）：

```json
{
  "locales": [
    { "code": "zh-CN", "name": "Chinese (Simplified)" },
    { "code": "en-US", "name": "English (United States)" }
  ],
  "default_locale_code": "zh-CN",
  "count": 2
}
```

---

## 6. 常见问题

### 顶栏没有语言切换？

- 商店只配置了 **一种** 语言 → 设计为隐藏切换器
- 解决：在 **商店 → 语言** 再添加至少一种语言

### 改了默认语言，C 端仍是旧语言？

- 浏览器 cookie / localStorage 可能记录了用户上次选择
- 解决：无痕窗口访问，或清除站点数据后再试
- Admin 配置本身有约 **60 秒** API 缓存

### 访问 `/` 没有跳转到 `/zh/` 或 `/en/`？

- 检查 `PUBLIC_API_URL` 是否指向正在运行的 server
- 检查 Admin 是否已设置 **默认语言**
- 检查 `/api/store/locales` 是否返回 `default_locale_code`

### 静态构建（SSG）语言不对？

- 构建时需 **能访问 Admin 对应的后端 API**（构建机设置 `PUBLIC_API_URL`）
- 或显式设置 `PUBLIC_SSG_LOCALES=zh-CN,en-US`

---

## 7. 相关文档

| 文档 | 内容 |
|------|------|
| [ADMIN-USER-GUIDE.md](../ADMIN-USER-GUIDE.md) | Admin 商店、地区、货币、支付渠道 |
| [storefront-conventions.md](./storefront-conventions.md) | 开发者目录与 env 变量 |
| [adapter-deployment.md](./adapter-deployment.md) | 生产部署与 CI |
| [QUICKSTART.md](../QUICKSTART.md) | 本地启动 |
