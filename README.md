# litematic-manager

一个用于 Minecraft `.litematic` 原理图文件的管理系统。用户可以上传、搜索、生成、下载原理图。

## 项目特性

*   **原理图上传**: 支持上传 `.litematic` 格式的文件。
*   **原理图生成**: 通过输入尺寸以生成合适尺寸的投影。

## 技术栈

*   **后端**: Express.js
*   **前端**: Vite

## 系统要求

*   **Node.js**: v22.20.0 或更高版本
*   **MySQL**: 5.7 或更高版本
*   **浏览器**: Chrome, Firefox, Edge 等现代浏览器

# 开发

*   **克隆主应用仓库**:
    ```bash
    git clone https://github.com/Bdbmzwsc/litematic-manager.git
    cd litematic-manager
    ```

## 后端配置与启动

*   **进入主应用后端目录**:
    ```bash
    cd path/to/litematic-manager
    ```
*   **安装依赖**:
    ```bash
    npm install
    npm install dotenv # 安装 dotenv 用于环境变量
    ```
*   **配置环境变量**: 在项目根目录创建 `.env` 文件，并配置数据库连接信息和渲染服务器地址：
    ```dotenv:.env
    # 数据库配置
    DB_HOST=localhost
    DB_PORT=3306
    DB_USER=root
    DB_PASSWORD=123456
    DB_NAME=litematic

    # 服务器配置
    PORT=3001
    RENDER_SERVER_URL=http://localhost:3000

    # JWE配置
    JWT_SECRET=YOUR_JWE_SECRET
    JWT_EXPIRES_IN=24h
    JWT_ISSUSER=ISSUSER

    # 文件上传配置
    UPLOAD_DIR=./uploads
    MAX_FILE_SIZE=10485760  # 10MB

    # 跨域配置
    CORS_ORIGIN=http://localhost:3000
    ```
*   **启动后端服务**:
    *   开发模式 (自动重启):
        ```bash
        npm run dev
        ```
    *   生产模式:
        ```bash
        npm start
        ```
    *   后端服务默认运行在 `http://localhost:3001`。

## 前端配置与启动

*   **进入 client 目录**:
    ```bash
    cd client
    ```
*   **安装依赖**:
    ```bash
    npm install
    ```
*   **启动前端开发服务器**:
    ```bash
    npm run dev
    ```
# 参考
- [A1Panda.litematic-viewer[CP/OL].https://github.com/A1Panda/litematic-viewer](https://github.com/A1Panda/litematic-viewer) 
