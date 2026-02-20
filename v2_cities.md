# V2 版本开发任务：首页“低成本旅居城市”模块上云

## 1. 任务目标
将首页 (指南页) 的城市列表从本地前端写死的假数据，重构为由 Node.js 后端 + MySQL 数据库驱动的真实接口数据。

## 2. 数据库设计 (MySQL)
请提供一段 SQL 语句（写在注释或单独文件中），创建 `cities` 表并插入 3-4 条初始数据：
- 字段建议：
  - `id` (主键，自增)
  - `name` (城市名称，如：鹤岗市)
  - `location` (地理位置/行政区划，如：兴安区、东山区)
  - `tags` (标签，JSON 格式或逗号分隔的字符串，如：'["三甲配套", "空城(人少)", "雪景"]')
  - `rent_price` (月租金参考，INT，如：100)
  - `buy_price_desc` (买房参考描述，VARCHAR，如：'买房 约2W/套')
  - `cover_image` (封面图路径，VARCHAR，默认使用本地静态路径，如：'/static/images/hegang.jpg')
  - `editor_comment` (小编点评，VARCHAR)

## 3. 后端开发 (Node.js)
1. **新建路由**：在 `server/src/routes/` 下创建 `city.js`。
2. **核心接口**：
   - `GET /api/cities`: 查询城市列表。要求能支持可选的 query 参数进行简单的过滤（例如 `?maxRent=500` 或者 `?tag=海边`，如果没传参数则返回全部）。
3. **注册路由**：在 `server.js` 中引入并使用 `app.use('/api/cities', cityRoutes)`。

## 4. 前端改造 (UniApp)
1. **页面修改**：修改首页文件（可能是 `pages/index/index.uvue` 或 `pages/guide/guide.uvue`）。
2. **数据请求**：在 `onMounted` 或 `onLoad` 生命周期中，使用 `uni.request` 调用 `GET /api/cities` 接口。
3. **动态渲染**：将原来写死的列表数据（如鹤岗、延边、绥化等）替换为一个 `ref` 响应式数组，使用 `v-for` 遍历后端返回的数据渲染 UI。
4. **保留过滤按钮逻辑**：确保顶部的“租金<500”、“海边城市”等筛选按钮能触发重新请求接口或在前端进行过滤。