# 需求：实现个人中心头像上传功能 (对接阿里云 OSS)

## 1. 任务目标
在现有的个人资料编辑功能基础上，增加“修改头像”功能。前端选择图片后，通过 Node.js 后端将图片上传至阿里云 OSS，并将返回的 URL 更新到 MySQL 数据库中。

## 2. 后端修改 (server 目录)
1. **安装新依赖**：请确保安装 `multer` (处理文件上传) 和 `ali-oss` (阿里云 SDK)。
2. **OSS 配置**：在 `server.js` 中引入 `ali-oss`，并通过 `process.env` 读取 OSS 配置（Region, AccessKeyId, AccessKeySecret, Bucket）。
3. **新增上传接口**：提供 `POST /api/user/avatar` 接口。
   - 使用 `multer` 接收单张图片 (字段名设为 `avatar`)。
   - 生成唯一文件名（如 `Date.now() + 随机数`）。
   - 调用 OSS SDK 将图片上传到 bucket 中（可放在 `avatars/` 目录下）。
   - 获取 OSS 返回的真实访问 URL。
   - 执行 SQL：`UPDATE users SET avatar = ? WHERE id = 1`，将新 URL 存入数据库。
   - 返回 JSON：`{ success: true, avatarUrl: "..." }`。

## 3. 前端修改 (pages/user/user.uvue)
1. **UI 改造**：
   - 当 `isEditing` 为 `true` 时，给头像图片上方加一个半透明的遮罩或一个小相机图标 📷，提示用户“点击更换头像”。
2. **交互逻辑**：
   - 点击头像触发 `onChangeAvatar` 方法。
   - 调用 `uni.chooseImage` 允许用户从相册选择 1 张图片。
   - 选好后，调用 `uni.uploadFile` 将图片发往 `http://localhost:3000/api/user/avatar`，name 设为 `avatar`。
   - 上传成功后，将接口返回的新 `avatarUrl` 实时更新到页面的响应式数据中，让头像立刻刷新。