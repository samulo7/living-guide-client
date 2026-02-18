# 架构文档 — Living Guide Client

## 1. 概览
- 形态：Uni-app x 客户端（Vue 3 + UTS），单端/多端构建。
- 数据：本地静态 JSON（`static/data/data.json`）为主，可切换到 CDN 静态 JSON。
- 网络：仅用于拉取静态数据与打开地图 WebView，无业务后端调用。
- 鉴权：当前仓库内**未实现任何登录/鉴权/权限控制**。

## 2. 目录结构与职责
- `main.uts`：应用入口，创建 SSR App 并挂载 `App.uvue`。
- `App.uvue`：全局生命周期（Launch/Show/Hide/Exit）与安卓返回键逻辑。
- `pages.json`：页面路由定义与全局样式。
- `pages/index/index.uvue`：列表/筛选/搜索入口页。
- `pages/detail/detail.uvue`：城市详情页，包含地图入口与“反馈”弹窗。
- `pages/webview/webview.uvue`：通用 WebView 容器（用于地图链接）。
- `components/CityCard.uvue`：城市卡片组件。
- `utils/dataLoader.uts`：数据加载、缓存、版本控制与请求封装。
- `types/city.uts`：数据模型定义。
- `static/data/data.json`：静态数据源（由外部 ETL 生成）。

## 3. 运行时流程
1. `pages/index/index.uvue` 在 `onMounted` 调用 `loadCityData()`。
2. `utils/dataLoader.uts` 组装数据 URL（本地文件或 CDN）并追加时间戳，调用 `uni.request` 拉取 JSON。
3. 拉取成功后进行 JSON 解析、版本判断与本地缓存写入。
4. 列表页做本地筛选与排序；点击卡片跳转详情页 `/pages/detail/detail?id=...`。
5. 详情页再次调用 `loadCityData()`，按 `id` 从本地数据中查找并渲染详情。
6. 地图入口通过 WebView 打开高德地图 URL（仅浏览，不涉及业务 API）。
7. “反馈”弹窗当前仅本地打印日志，不进行网络提交。

## 4. 数据流与缓存策略
- 数据来源：
  - 默认：`/static/data/data.json`（随包发布或本地资源）。
  - 可选：`CDN_DATA_URL`（`utils/dataLoader.uts` 内可切换）。
- 缓存：
  - `uni.setStorageSync`/`getStorageSync` 缓存 `cached_city_data`。
  - `IS_DEV = true` 时强制刷新；生产模式下基于 `version` 判断是否复用缓存。
- 错误兜底：请求失败时回退到缓存（若存在）。

## 5. 鉴权与权限处理（重点）

### 5.1 前端鉴权（现状）
当前前端**没有登录态或鉴权逻辑**，表现为：
- 无登录页、无账号体系、无 token/cookie 存储。
- `utils/dataLoader.uts` 的 `uni.request` 未携带鉴权头（如 `Authorization`）。
- `pages.json` 中 `uniIdRouter` 为空，未配置任何路由守卫或权限控制。
- 所有页面默认可访问，仅依赖本地数据或静态 CDN 数据。

### 5.2 后端鉴权（现状）
当前仓库**不包含任何后端服务**：
- 没有 API Server、没有认证端点、没有权限校验逻辑。
- 数据来源为静态 JSON（本地或 CDN），因此通常也不需要鉴权。

### 5.3 结论
当前项目是**纯客户端 + 静态数据**架构，**无前后端鉴权**。如需引入用户体系或数据写入（例如反馈上报、收藏同步），需新增后端服务并设计统一鉴权方案（如基于 token 的登录态）。

## 6. 风险与建议（如需扩展）
- 若计划引入用户数据写入：
  - 增加登录流程与 token 管理（本地存储 + 请求拦截）。
  - 后端提供认证与鉴权中间件（如 JWT + RBAC）。
  - 对“反馈/收藏”等接口进行权限校验与限流。
- 若继续使用静态 CDN：
  - 依旧无需鉴权，但应考虑 CDN 缓存控制与版本管理。
