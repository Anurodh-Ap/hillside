# ── Hillside Coffee · Frontend ──
# Serves static files (index.html, style.css, app.js) via nginx
# Also proxies /api/* requests to the backend container

FROM nginx:alpine

# Copy all frontend files
COPY index.html /usr/share/nginx/html/index.html
COPY style.css  /usr/share/nginx/html/style.css
COPY app.js     /usr/share/nginx/html/app.js

# Copy custom nginx config (handles /api proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
