# 学生信息管理系统（Vercel + Neon）

## 功能

- 管理员登录：可对学生信息进行增删改查（含模糊搜索、分页）。
- 学生注册/登录：登录后仅能查看自己的信息。
- 数据初始化：首次访问任一接口会自动建表并写入默认管理员与示例学生。
- 中文支持：接口返回 `utf-8`，页面 `meta charset="UTF-8"`。

## 默认账号

- 管理员：用户名 `admin`，密码 `admin`
- 示例学生：学号 `20250001` / `20250002` / `20250003`，密码均为 `123456`

## Neon 表结构

首次请求会自动创建：

- `admins(username, password_hash, created_at)`
- `students(student_no, name, gender, age, class_name, major, phone, email, address, password_hash, created_at, updated_at)`

## 本地运行

1. 安装依赖：`npm i`
2. 设置环境变量（示例）：`DATABASE_URL=...`
3. 启动：`npm run dev`

健康检查接口：`/api/health`

## 部署到 Vercel

- 在 Vercel 项目环境变量中配置 `DATABASE_URL`（Neon 的连接字符串）。
- 建议额外配置 `AUTH_SECRET`（任意长随机字符串，用于签发登录 Cookie）。
- 部署后访问首页即可使用；如需触发初始化，打开 `/api/health`。
