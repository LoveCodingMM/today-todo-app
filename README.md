# 今日待办应用（today-todo-app）

一个带本地账号密码登录的全栈今日待办应用，支持按日期查看、历史记录与任务状态管理。

## 功能概览
- 账号注册/登录与会话管理
- 今日待办的新增、编辑、删除、完成切换
- 按日期筛选与历史范围查询
- 响应式界面与基础错误/加载处理

## 技术栈
- 前端：Vite + React + Tailwind CSS + tRPC React Query
- 后端：Node.js + Express + tRPC + Drizzle ORM
- 数据库：MySQL / SQLite
- 工具：Vitest、pnpm、drizzle-kit

## 目录结构
```
client/    前端应用（Vite）
server/    后端服务（Express + tRPC）
shared/    前后端共享代码
drizzle/   数据库 schema 与迁移
```

## 环境变量
在项目根目录创建 `.env`，以下变量按需配置：

必需（核心功能）：
- `JWT_SECRET`：会话签名密钥
- `DATABASE_URL`：数据库连接串（MySQL/SQLite）

可选（增强功能）：
- `OWNER_USERNAME`：指定管理员用户名
- `DB_DIALECT`：强制指定 `mysql` 或 `sqlite`（默认根据 `DATABASE_URL` 推断）
- `VITE_FRONTEND_FORGE_API_URL`：地图代理服务地址（默认 `https://forge.butterfly-effect.dev`）
- `VITE_FRONTEND_FORGE_API_KEY`：地图相关 API Key
- `BUILT_IN_FORGE_API_URL`、`BUILT_IN_FORGE_API_KEY`：服务端相关扩展能力
- `VITE_ANALYTICS_ENDPOINT`、`VITE_ANALYTICS_WEBSITE_ID`：Umami 统计（可不配）
- `PORT`：服务端端口（默认 3000，会在 3000-3019 范围内自动寻址）

## 开发启动
```bash
pnpm install
pnpm dev
```
启动后访问 `http://localhost:3000/`（若端口占用会自动切换）。

## 账号使用
首次进入请先注册账号，之后使用账号密码登录。

## 构建与生产
```bash
pnpm build
pnpm start
```
构建产物：前端输出到 `dist/public`，后端入口为 `dist/index.js`。

## 数据库与迁移
```bash
pnpm db:push
```
使用 `DATABASE_URL` 生成并执行 Drizzle 迁移。

SQLite 示例：
```
DATABASE_URL=sqlite:./data.db
```

## 测试与检查
```bash
pnpm test
pnpm check
```
