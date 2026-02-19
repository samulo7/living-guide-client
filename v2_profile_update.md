# V2 版本开发任务：实现“修改个人资料”功能 (前后端联调)

## 1. 任务目标
在现有的个人中心页面上，允许用户修改自己的“昵称 (username)”和“个性签名 (tagline)”，并将修改后的数据保存到 MySQL 数据库中。

## 2. 后端修改 (server/server.js)
请在现有的 Express 服务中增加以下内容：
1. **确保启用了 JSON 解析中间件**：`app.use(express.json());` (这步非常重要，否则后端拿不到前端发来的数据)。
2. **新增一个 PUT 接口**：`PUT /api/user/profile`
3. **接口逻辑**：
   - 接收请求体 `req.body` 中的 `username` 和 `tagline`。
   - 执行 SQL 更新语句：`UPDATE users SET username = ?, tagline = ? WHERE id = 1` (为了 MVP 演示，我们暂时固定更新 ID 为 1 的测试用户)。
   - 更新成功后，返回 `{ success: true, message: '更新成功' }`。

## 3. 前端修改 (pages/user/user.uvue)
请在不破坏现有 UI 结构的前提下，进行以下改造：
1. **增加“编辑”状态**：在页面中增加一个响应式变量 `isEditing` (默认为 false)。
2. **UI 交互**：
   - 在头像下方/昵称旁边加一个“✏️ 编辑资料”的小按钮。
   - 点击后，`isEditing` 变为 true。原来的文本展示区（昵称和个性签名）变成 `<input>` 输入框。
   - 按钮变成“💾 保存”和“取消”。
3. **保存逻辑 (saveProfile)**：
   - 点击“保存”时，前端使用 `uni.request` 发起 `PUT` 请求到 `http://localhost:3000/api/user/profile`。
   - 请求 data 中携带绑定的新 `username` 和 `tagline`。
   - 接口请求成功后，使用 `uni.showToast` 提示“保存成功”，并将 `isEditing` 设回 false，页面展示最新的名字。