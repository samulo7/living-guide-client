# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm install --registry=https://registry.npmmirror.com

# 复制项目文件并构建
COPY . .
RUN npm run build:h5

# 生产阶段
FROM nginx:alpine

# 复制构建产物到 Nginx
COPY --from=builder /app/dist/build/h5 /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]