# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json
COPY package.json ./

# 安装依赖
RUN npm install --registry=https://registry.npmmirror.com

# 复制所有文件
COPY . .

# 构建 H5
RUN npm run build:h5

# 生产阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist/build/h5 /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]