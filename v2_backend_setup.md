# V2 版本开发任务：后端架构搭建与用户中心改造

## 1. 项目背景
当前项目是一个基于 UniApp 的数字游民生活指南 App（MVP 版本已完成）。
**当前状态**：数据全是本地 JSON 文件。
**目标状态**：从 V1 迁移到 V2，引入 **MySQL 数据库** 和 **Node.js 后端服务**。

## 2. 任务目标 (Phase 1)
搭建后端基础架构，并改造“个人中心”模块，使其从 MySQL 数据库读取真实的用户信息，不再使用 JSON。

## 3. 技术栈
* **数据库**：MySQL 8.0 (已启动)
* **后端**：Node.js + Express + MySQL2 (驱动)
* **前端**：UniApp (Vue3)

## 4. 详细实施步骤

### 步骤 1：数据库初始化 (Database Schema)
请生成一个 SQL 脚本 `server/db/init.sql`，包含以下内容：
1.  创建数据库 `nomad_guide`。
2.  创建表 `users`，字段包括：
    * `id` (INT, Primary Key, Auto Increment)
    * `username` (VARCHAR, 昵称)
    * `avatar` (VARCHAR, 头像 URL)
    * `tagline` (VARCHAR, 个性签名/旅居天数)
    * `balance` (DECIMAL, 钱包余额)
    * `created_at` (DATETIME)
3.  **Seed Data (种子数据)**：插入一条测试数据（模拟之前的“流浪诗人”用户），确保数据库不为空。

### 步骤 2：搭建 Node.js 后端服务
在项目根目录下创建一个名为 `server` 的文件夹，并初始化一个 Express 项目：
1.  `package.json`：包含 `express`, `mysql2`, `cors`, `dotenv`。
2.  `server.js` (入口文件)：
    * 配置 CORS (允许前端跨域访问)。
    * 连接 MySQL 数据库 (配置信息提取到 `.env` 文件，默认使用 localhost:3306, user: root, pass: root123)。
    * **编写 API 接口**：`GET /api/user/profile`。
    * **逻辑**：查询 `users` 表的第一条数据并返回 JSON。

### 步骤 3：前端对接 (Frontend Integration)
修改 `pages/user/user.uvue`：
1.  **移除** 对 `static/data/user.json` 的引用。
2.  **新增** `fetchUserProfile` 方法：
    * 使用 `uni.request` 发起 GET 请求：`http://localhost:3000/api/user/profile`。
    * 将返回的数据映射到页面的响应式变量中。
3.  在 `onLoad` 生命周期中调用该方法。

## 5. 输出要求
请直接给出所有需要创建/修改的文件代码，并提供启动后端的终端命令。
不要破坏原有的前端 UI 样式，只改变数据来源。