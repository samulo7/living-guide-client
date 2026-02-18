# 需求文档：新增“旅居搭子 (Nomad Radar)”模块

## 1. 项目上下文 (Context)
* **当前任务**：新增 App 的第三大核心模块——社交。
* **核心价值**：解决旅居者的孤独感。主打“轻社交”、“搭子文化”（只做事，不尬聊）。
* **技术约束**：继续使用 **JSON 静态数据** 模拟用户和地理位置，无需真实后端。

## 2. 核心功能概述
一个基于“地理位置”的动态广场。
用户可以看到“此时此刻”距离自己最近的其他旅居者，以及他们正在发起的活动（如：拼饭、夜跑、发呆）。

## 3. 数据存储 (Data Storage - JSON Mode)

**操作要求：**
1.  在 `public/data/` 下新建 `activities.json` (活动/动态数据)。
2.  数据结构 (Array of Objects)：

```json
[
  {
    "id": "act_001",
    "user": {
      "id": "u_001",
      "nickname": "野生程序员",
      "avatar": "/assets/avatars/geek.jpg",
      "tags": ["社恐", "代码", "鹤岗"]
    },
    "type": "drink", // 咖啡/酒
    "title": "有人在人民广场附近吗？想拼个瑞幸",
    "distance": "0.5km", // 静态模拟距离
    "time_ago": "5分钟前",
    "status": "active", // active=进行中, full=已满
    "max_people": 2,
    "joined_people": 1
  },
  {
    "id": "act_002",
    "user": {
      "id": "u_002",
      "nickname": "大理风行者",
      "avatar": "/assets/avatars/girl.jpg",
      "tags": ["摄影", "徒步"]
    },
    "type": "sport", // 运动
    "title": "夜跑5公里，洱海边出发，配速600",
    "distance": "1.2km",
    "time_ago": "20分钟前",
    "status": "active",
    "max_people": 5,
    "joined_people": 2
  }
]
4. 前端界面 (Frontend UI)
4.1 入口导航
底部 TabBar 新增第 4 个入口：[搭子] (图标建议用 Radar/UserGroup)。

高亮色：使用 活力紫 (#722ED1) 或 电光蓝，区别于前面的青色、金色、米色。

4.2 广场列表页 (Radar Feed)
顶部：一个巨大的“雷达扫描”动画效果（CSS 动画），暗示正在搜索附近的人。

内容区：瀑布流或列表展示 activities.json 的内容。

卡片设计：

左侧：用户头像（带圆角）。

中间：

第一行：昵称 + 距离标签 (e.g., 📍0.5km)。

第二行：活动内容 (加粗)。

第三行：几个个性标签 (Pills)。

右侧：一个大大的 “加入” 按钮 (Outline 风格)。

4.3 发布按钮 (Floating Action Button)
在页面右下角放置一个悬浮按钮 +。

点击后弹出模拟框：“发起什么局？(吃饭/运动/发呆/游戏)”。

5. 交互逻辑 (Interaction)
点击“加入”：弹出 Toast 提示“已发送申请，等待对方通过~”（纯模拟）。

雷达动画：进入页面时，雷达图标旋转 2 秒，然后列表项逐个 FadeIn 显示出来，增加仪式感。

6. 执行步骤
创建 activities.json。

创建 ActivityCard.vue 组件。

创建 SocialView.vue 页面（包含雷达动画）。

修改 TabBar 增加 [搭子] 入口。

调整 App 主题色配置，支持紫色的局部应用。