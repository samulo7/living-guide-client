# 这是一个纯静态部署的 Dockerfile，非常快且不易出错
FROM nginx:alpine

# ⚠️ 核心修改：
# 不要 COPY . (不要复制源码)
# 只要 COPY 那个生成的 web 文件夹
# 请务必核对你本地生成的目录是不是叫 web，有时叫 h5
COPY unpackage/dist/build/web/ /usr/share/nginx/html/

# Nginx 配置保持不变
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]