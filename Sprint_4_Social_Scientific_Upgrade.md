# Codex 任务书：Sprint 4 - 社交功能『科学化』全栈重构

## 1. 视觉环境与编码矫正 (Priority: Block-Level)
- **字符集统一**：强制后端 Response Header 包含 `charset=utf-8`，根除 image_25789e.png 中的导航栏乱码。
- **文件编码**：确保所有新生成的 .uvue 文件以 UTF-8 编码保存。
- **UI 汉化**：将所有社交模块的英文标签（Title, Content, Publish）替换为中文（标题, 内容, 立即发布）。

## 2. “科学版”发布页重塑 (publish.uvue)
- **高德位置服务 (AMap)**：
    - 废弃文本输入，点击『位置』区域需调用 `uni.chooseLocation` 接口。
    - **逻辑要求**：从高德返回的对象中提取 `name` (地标)、`address` (详细地址)、`city` (城市名) 以及经纬度坐标。
    - **UI 展示**：选定后在界面显示『📍 城市 · 地标名』。
- **媒体管理**：实现图片上传逻辑，支持 0-3 张图片展示及相对路径存储。
- **字段扩容**：后端 `companions` 表需支持存储位置 JSON 对象、图片数组、以及联系方式 (Contact)。

## 3. 后端架构：拒绝身份孤岛 (Data Real-time Sync)
- **实时联表 (JOIN)**：
    - 重构 `GET /api/social/list` 与 `detail` 接口。
    - **核心逻辑**：严禁在帖子表存储用户昵称/头像。必须通过 `LEFT JOIN users ON companions.user_id = users.id` 实时关联抓取。
    - **验收目标**：彻底解决 image_413ea1.png 中同一用户头像显示不一致的问题。

## 4. 社交闭环补全 (social.uvue & detail.uvue)
- **详情页开发**：新建详情页，展示图片轮播、地理位置标识、完整正文及『想要联系』按钮。
- **雷达兼容**：确保重构后的 social.uvue 页面中，顶部的雷达扫描动画与下方的搭子列表可以和谐共存，不产生层级冲突。
- **时区对齐**：修复 image_b69616.png 中的 8 小时 UTC 时差，发帖时间展示为北京时间。