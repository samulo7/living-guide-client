# 需求文档：新增“流浪转租 (Nomad Sublet)”模块

## 1. 项目上下文 (Context)
* **当前任务**：在现有的旅居指南 App 中，新增一个“转租/短租房源”板块。
* **业务逻辑**：这是“居住”环节的闭环。用户在首页看中了“鹤岗”，现在要在本模块找到具体的“鹤岗短租房”。
* **技术约束**：继续使用 **JSON 静态数据源** (MVP模式)，纯前端实现。

## 2. 核心功能概述
创建一个房源列表，专门展示 **"短租" (1-3个月)**、**"转租" (个人房源)** 信息。
核心痛点解决：**无需押一付三，支持短租。**

## 3. 数据存储 (Data Storage - JSON Mode)

**操作要求：**
1.  在 `public/data/` 下新建 `sublets.json`。
2.  数据结构 (Array of Objects)：

```json
[
  {
    "id": "room_001",
    "city_name": "鹤岗", // 关联字段
    "district": "兴安区",
    "community": "岭北小区",
    "title": "向阳一居室，带暖气，可做饭",
    "price": 300,
    "price_unit": "元/月",
    "min_duration": "1个月起租",
    "tags": ["房东直租", "免押金", "有宽带"],
    "cover_image": "/assets/rooms/room1.jpg", // 请使用占位图
    "owner_avatar": "/assets/avatars/user1.jpg",
    "owner_name": "王大爷",
    "is_verified": true // 平台核验（金标）
  },
  {
    "id": "room_002",
    "city_name": "大理",
    "district": "古城",
    "community": "才村",
    "title": "海景大床房，转租2个月，送电动车",
    "price": 1200,
    "price_unit": "元/月",
    "min_duration": "2个月起租",
    "tags": ["个人转租", "可看海", "猫咪友好"],
    "cover_image": "/assets/rooms/room2.jpg",
    "owner_avatar": "/assets/avatars/user2.jpg",
    "owner_name": "Lisa",
    "is_verified": false
  }
]
##4. 前端界面 (Frontend UI)
##4.1 入口策略
策略 A (独立入口)：在底部 TabBar 新增第 3 个 Tab —— [安家] (图标用 House/Key)。

策略 B (详情页挂载)：在“城市详情页”底部增加“该城市转租房源”推荐位。

本次实现：请同时实现 A 和 B。

底部导航栏增加 [安家] Tab。

城市详情页底部增加“本市房源推荐”组件。

##4.2 房源列表页 (Sublet List View)
风格：温馨、家居感。主色调使用 暖米色 (#F5F5DC) 或 柔和的靛青色 (#1890FF)。

卡片设计：

大图模式：图片占比 60%，强调居住环境。

关键信息：价格 (¥300/月) > 租期 (1月起) > 标题。

信任标：如果是 is_verified: true，显示“✅ 实探/房东直签”标签。

##4.3 房源详情页 (Room Detail View)
相册轮播：顶部大图轮播。

配套设施：用图标展示 (WiFi, 淋浴, 厨房, 暖气)。

地图组件：简单展示大概位置。

底部栏：

左侧：房东头像 + “联系房东” (模拟弹窗显示微信号)。

右侧：大按钮 “我想租” (灰色不可点，提示“需登录”) 或直接跳转联系。

##5. 逻辑要求 (Logic)
全局筛选：在 [安家] Tab 页，顶部要有“城市筛选” (读取 cities.json 生成选项)。

详情页联动：当用户在“鹤岗详情页”点击“查看房源”时，跳转到 [安家] 列表页并自动选中“鹤岗”。

##6. 执行步骤
创建 sublets.json 数据。

创建 SubletCard.vue (房源卡片组件)。

创建 SubletView.vue (列表页) 和 RoomDetail.vue (详情页)。

修改 TabBar 增加入口。

修改 CityDetail.vue 增加“推荐房源”模块。