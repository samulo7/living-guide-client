# 需求文档：新增“我的基地 (User Center)”模块

## 1. 项目上下文
* **任务**：开发 App 底部第 5 个 Tab —— [我的]。
* **目标**：汇总用户数据，展示“数字游民”身份感。
* **数据策略**：新建 `user.json`，并通过 ID 关联之前的 `jobs.json` 和 `sublets.json`。

## 2. 数据存储 (Data Storage)

**操作：** 在 `static/data/` 下新建 `user.json`：
```json
{
  "id": "u_self_001",
  "nickname": "流浪诗人",
  "avatar": "/static/logo.png", // 暂时使用 Logo 或默认图
  "current_city": "鹤岗",
  "nomad_days": 45,
  "tags": ["文案高手", "省钱鬼才"],
  "stats": {
    "applied_jobs": 3,
    "posted_rooms": 1,
    "joined_parties": 2
  },
  "wallet": {
    "balance": 2450.00,
    "month_income": 3200
  }
}
3. 前端界面 (UI)
3.1 导航栏
修改 TabBar，增加第 5 个入口：[我的] (图标: User/Profile)。

选中色建议使用 深邃黑 (#333) 或 星空灰，体现“大本营”的沉稳。

3.2 页面布局 (User Profile)
顶部：身份卡片 (Identity Card)

背景：使用一张风景图作为 Banner。

内容：头像居中 + 昵称 + "已在鹤岗旅居 45 天" (高亮展示)。

标签：展示用户的 tags (Pill 样式)。

中部：数据仪表盘 (Dashboard)

使用 Grid 布局展示 3 个核心数据：

💼 搞钱 (关联 applied_jobs)

🏠 安家 (关联 posted_rooms)

💜 搭子 (关联 joined_parties)

下部：功能列表 (Menu List)

📄 我的简历 (显示 "完整度 85%")

❤️ 收藏城市

⚙️ 系统设置 (包含一个假的 "退出登录" 按钮)

4. 执行逻辑
创建 user.json。

创建 UserCenter.uvue 页面。

修改 TabBar 补齐最后一块拼图。

全局样式检查：确保底部 5 个图标宽度平分，不要挤在一起。