# V2 版本开发任务：实现 JWT 登录注册系统

## 1. 任务目标
抛弃硬编码的 userId，实现基于 JWT (JSON Web Token) 的真实注册、登录逻辑，并改造现有的个人中心接口使其受鉴权保护。

## 2. 数据库改造 (Database)
请提供一段 SQL 语句（可以写在注释里或单独的 sql 文件中），用于修改现有的 `users` 表：
- 新增 `phone` 字段 (VARCHAR(20), UNIQUE, 不能为空，作为登录账号)
- 新增 `password` 字段 (VARCHAR(255), 不能为空，存储哈希后的密码)

## 3. 后端改造 (Node.js)
1. **安装依赖**：需要安装 `jsonwebtoken` 和 `bcryptjs` (用于密码加密)。
2. **新建路由**：创建 `server/src/routes/auth.js`，包含：
   - `POST /register`: 接收 phone 和 password，使用 bcryptjs 加密密码后存入数据库，默认初始化一个随机 username。
   - `POST /login`: 接收 phone 和 password，校验成功后，使用 `jsonwebtoken` 生成 Token (包含 userId) 并返回。
3. **增加鉴权中间件**：创建 `server/src/middleware/authMiddleware.js`，用于拦截请求并解析 header 中的 `Authorization: Bearer <token>`。
4. **改造现有接口**：修改 `routes/user.js`，让 `/profile` 和 `/avatar` 接口应用上述中间件，并把原先写死的 `WHERE id = 1` 改为 `WHERE id = req.user.id`。

## 4. 前端改造 (UniApp)
1. **新建登录页**：创建 `pages/login/login.uvue` (并在 pages.json 中注册)。
   - 包含简单的手机号、密码输入框，以及“登录”和“注册”按钮。
   - 登录成功后，使用 `uni.setStorageSync('token', res.token)` 保存 Token，并跳转回 `pages/user/user` (或首页)。
2. **改造请求**：在 `pages/user/user.uvue` (以及未来的所有请求中)，在 `uni.request` 的 `header` 中带上 `Authorization: 'Bearer ' + uni.getStorageSync('token')`。
3. **状态处理**：如果后端返回 401 (未登录或 token 过期)，拦截并跳转到 login 页面。