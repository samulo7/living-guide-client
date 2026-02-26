# Codex 任务指令：Sprint 3 (Part B) - 【搭子广场】真实发布逻辑

## 1. 任务背景
在 Sprint 3 (Part A) 中我们实现了房源收藏。现在需要打通【搭子广场】(Social) 的 UGC 闭环，让用户能够发布真实的“寻友帖”。

## 2. 后端开发要求 (Node.js)
- **接口路径**：`POST /api/social/publish`
- **安全检查**：必须应用 `authMiddleware` 鉴权中间件。
- **数据处理**：
    - 从 `req.body` 获取 `title`, `content`, `tags` (数组或逗号分隔)。
    - 从 `req.user.id` (JWT 解析结果) 获取当前登录用户的真实 ID。
- **数据库操作**：
    - 执行 SQL 将数据插入 `companions` 表。
    - 确保新记录的 `user_id` 与发布者严格对应，实现“数据隔离”。
- **响应**：成功后返回 `{ success: true, message: "发布成功" }`。

## 3. 前端开发要求 (Uniapp x / UVUE)
- **发布页面 (`pages/social/publish.uvue`)**：
    - 完善 UI 表单：标题输入框、内容多行文本框、简单的标签录入。
    - 交互：点击『立即发布』时调用 `utils/request.uts` 发起 POST 请求。
- **状态同步与反馈**：
    - 发布成功后，弹出 `uni.showToast('发布成功！')`。
    - **核心逻辑**：执行 `uni.$emit('REFRESH_SOCIAL_LIST')` 发送全局刷新信号。
    - 延时 1.5 秒后自动执行 `uni.navigateBack()` 返回广场页。
- **广场刷新 (`pages/social/social.uvue`)**：
    - 在 `onLoad` 中注册 `uni.$on('REFRESH_SOCIAL_LIST')` 监听。
    - 收到信号后，清空当前列表并重新调用 `fetchData()`，确保新帖排在最前面。

## 4. 验收标准
- 退出登录状态下无法点击“+”号发布（跳转登录）。
- 用户 A 发布的内容，用户 B 在广场能看到，但在 A 的个人主页显示为“我的发布”。
- 数据库 `companions` 表成功增加该用户的发布记录。