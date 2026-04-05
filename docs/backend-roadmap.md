# Scenecraft AI 渐进式后端实施路线

## 1. 当前判断

基于现有代码和附件内容，这个项目适合采用下面这条最小可行后端路线：

- Web: Next.js App Router
- Auth: better-auth
- DB: Neon Postgres
- ORM: Drizzle ORM
- Storage:
  - 第一阶段求快: Vercel Blob
  - 中长期控成本: Cloudflare R2
- 数据建模策略: `projects.snapshot` 直接存完整 `EditorProjectJSON`

这个判断和当前代码是对齐的：

- 认证已存在，但还未接数据库 adapter: [lib/auth.ts](/Users/mingyoungzhou/code/self/scenecraft-AI/lib/auth.ts)
- 编辑器项目结构已经是完整快照模型: [render/editor/core/types.ts](/Users/mingyoungzhou/code/self/scenecraft-AI/render/editor/core/types.ts)
- 项目序列化/反序列化已具备: [render/editor/models/projectModel.ts](/Users/mingyoungzhou/code/self/scenecraft-AI/render/editor/models/projectModel.ts)
- 默认空项目工厂已具备: [render/editor/factories/projectFactory.ts](/Users/mingyoungzhou/code/self/scenecraft-AI/render/editor/factories/projectFactory.ts)

## 2. 核心原则

- 先做“单用户 + 完整快照保存”，不要一开始拆复杂业务表
- 所有项目、素材都必须绑定 `user_id`
- 大文件走对象存储直传，服务端只做鉴权、签名、元数据入库
- 数据结构优先兼容演进，不追求第一版数据库范式最优
- 每个阶段都必须是“可运行、可验证、可部署”的

## 3. 推荐里程碑

### Milestone 0: 基础治理

目标：
让项目具备可持续开发的最低基础，先把环境、目录、约定稳定下来。

任务：

- 新建 `docs/architecture.md`，记录技术栈、数据流、部署目标
- 新建 `docs/env.md`，记录本地与 Vercel 环境变量
- 增加 `.env.example`
- 新建 `lib/server/` 目录，集中放数据库、鉴权、API 公共方法
- 新建 `db/` 目录，后续放 schema、迁移、查询封装
- 约定 API 返回结构和错误码格式

验收标准：

- 新同学拿到仓库能知道项目后端怎么跑
- 环境变量清单完整
- 后端基础目录结构固定下来

### Milestone 1: 数据库接入 + better-auth 落库

目标：
把当前认证从“只有配置”升级成“真实可持久化认证”。

任务：

- 安装并配置 Drizzle、Postgres 驱动、better-auth 对应 adapter
- 配置 Neon 数据库连接
- 增加 Drizzle 配置文件
- 建立 auth 相关表
- 修改 [lib/auth.ts](/Users/mingyoungzhou/code/self/scenecraft-AI/lib/auth.ts)，接入数据库 adapter
- 跑通邮箱注册、登录、会话持久化、重置密码
- 补充获取当前登录用户的服务端方法，例如 `requireSessionUser()`

建议交付：

- `db/schema/auth.ts`
- `db/index.ts`
- `lib/server/auth/requireSessionUser.ts`
- `drizzle.config.ts`

验收标准：

- 注册后用户信息会写入 Postgres
- 刷新页面不会丢失会话
- 未登录访问受保护接口会正确返回 401

### Milestone 2: 项目表 + 最小保存闭环

目标：
先完成最关键的商业闭环：用户可以新建项目，并把编辑器状态保存到数据库。

任务：

- 新建 `projects` 表
- 增加 `ProjectSnapshot` 的运行时校验方案
- 实现 `POST /api/projects`
- 实现 `PUT /api/projects/[id]`
- 增加按 `user_id` 查询项目权限校验
- 前端编辑器接入“新建项目”
- 前端编辑器接入“手动保存项目”
- 处理保存状态：保存中、成功、失败

建议表结构：

- `id uuid pk`
- `user_id text/uuid not null`
- `title varchar not null`
- `description text null`
- `status varchar not null default 'draft'`
- `snapshot jsonb not null`
- `version integer not null default 1`
- `thumbnail_asset_id uuid null`
- `created_at`
- `updated_at`
- `last_opened_at`
- `deleted_at null`

接口建议：

`POST /api/projects`

- 输入：
  - `title?: string`
- 行为：
  - 创建项目
  - `snapshot` 使用默认空项目结构
- 输出：
  - `projectId`
  - `version`
  - `snapshot`

`PUT /api/projects/[id]`

- 输入：
  - `title?: string`
  - `snapshot: EditorProjectJSON`
- 行为：
  - 校验项目归属
  - 全量覆盖 `snapshot`
  - `version = version + 1`
- 输出：
  - `projectId`
  - `version`
  - `updatedAt`

验收标准：

- 登录用户可以创建空项目
- 保存后数据库里可看到完整 JSON 快照
- 非项目所有者无法覆盖保存

### Milestone 3: 项目加载 + 我的项目列表

目标：
让“保存”真正可用起来，用户下次回来能继续编辑。

任务：

- 实现 `GET /api/projects/[id]`
- 实现 `GET /api/projects`
- 首页或工作台增加“我的项目列表”
- 编辑器根据 `projectId` 加载快照
- 增加项目更新时间排序
- 增加软删除能力或先用归档状态代替

接口建议：

`GET /api/projects`

- 支持按最近更新时间倒序
- 第一版只返回基础元信息，不返回完整 `snapshot`

`GET /api/projects/[id]`

- 返回完整项目快照
- 严格校验 `project.user_id === session.user.id`

验收标准：

- 用户可以从列表进入历史项目
- 加载后编辑器能恢复到保存时状态
- 未授权用户无法读取他人项目

### Milestone 4: 素材上传链路

目标：
让模型、贴图、环境图有正式存储通道，而不是临时 URL。

任务：

- 新建 `assets` 表
- 选定对象存储提供商
- 实现上传签名接口
- 实现客户端直传
- 上传成功后写入 `assets` 元数据
- 将模型、纹理、全景图 URL 接入资产系统

建议表结构：

- `id uuid pk`
- `user_id`
- `project_id null`
- `kind`
- `provider`
- `bucket null`
- `object_key`
- `url`
- `mime_type`
- `size_bytes`
- `original_name`
- `checksum null`
- `metadata jsonb null`
- `created_at`

验收标准：

- 模型文件可稳定上传
- 上传记录可在数据库中追踪
- 项目快照中的资源 URL 可指向正式对象存储

### Milestone 5: 上线准备

目标：
让项目具备首次公开部署和基础运营能力。

任务：

- 配置 Vercel 项目
- 通过 Vercel Marketplace 连接 Neon
- 配置正式环境变量
- 配置正式 `BETTER_AUTH_URL`
- 接入正式邮件服务
- 处理生产域名下的回调 URL
- 增加基础错误日志
- 增加健康检查和关键接口可观测性

验收标准：

- Vercel Preview 可用
- Production 可注册、登录、创建、保存、加载项目
- 文件上传在生产环境可用

### Milestone 6: 最低运营能力

目标：
从“能用”进入“能运营”。

任务：

- 项目封面图生成与存储
- 项目重命名、删除、复制
- 保存失败重试与更清晰的提示
- 限制单文件大小与支持的 MIME 类型
- 增加基础风控：接口频控、上传校验、输入校验
- 增加用户反馈入口和错误上报

验收标准：

- 用户能稳定管理自己的项目资产
- 常见异常不会直接导致数据不可恢复

## 4. 不建议现在做的事

- 不要先拆 `model`、`mesh`、`light` 多张业务表
- 不要一开始做多人协作
- 不要先做增量 patch 保存
- 不要一开始做复杂版本树
- 不要让上传链路走“浏览器 -> Next.js API -> 对象存储”的中转模式

## 5. 建议任务顺序

### Phase A: 两周内做出可保存 MVP

1. 补齐环境变量文档和 `.env.example`
2. 接入 Neon + Drizzle
3. 让 better-auth 落库
4. 建 `projects` 表
5. 做 `POST /api/projects`
6. 做 `PUT /api/projects/[id]`
7. 编辑器接入“新建 / 手动保存”

### Phase B: 做出可继续编辑的闭环

1. 做 `GET /api/projects`
2. 做 `GET /api/projects/[id]`
3. 首页加“我的项目”
4. 支持从项目列表恢复编辑

### Phase C: 打通素材系统

1. 建 `assets` 表
2. 接对象存储
3. 做签名上传
4. 模型、纹理、HDRI 全部切到正式存储

### Phase D: 准备上线运营

1. 接入正式邮件与正式域名
2. 部署到 Vercel
3. 配置监控和错误日志
4. 补基础管理功能

## 6. 每个阶段的开发任务模板

每次进入一个阶段，都建议按同样的任务模板推进：

1. 建 schema
2. 建 server query/service
3. 建 route handler
4. 建前端调用层
5. 接 UI 状态
6. 写最小验证
7. 本地通过后上 Vercel Preview

## 7. 第一批可直接开干的 Issue

### Issue 1: 引入 Drizzle 和 Neon

- 目标：建立数据库连接与迁移能力
- 输出：Drizzle 配置、DB client、首个迁移

### Issue 2: better-auth 接 Postgres

- 目标：让注册登录进入真实数据库
- 输出：auth adapter、auth tables、会话校验工具

### Issue 3: 项目表 schema

- 目标：落地 `projects` 表
- 输出：schema、迁移、基础 query 方法

### Issue 4: 新建项目接口

- 目标：登录用户可创建默认空项目
- 输出：`POST /api/projects`

### Issue 5: 保存项目接口

- 目标：编辑器完整快照可保存
- 输出：`PUT /api/projects/[id]`

### Issue 6: 编辑器接保存按钮

- 目标：前端能真正调保存 API
- 输出：保存状态管理、异常提示

### Issue 7: 项目列表与加载

- 目标：形成“退出再回来还能继续编辑”的闭环
- 输出：列表页、详情加载接口、恢复编辑

### Issue 8: 资产上传链路

- 目标：模型和纹理有正式落库方案
- 输出：`assets` 表、签名接口、客户端直传

## 8. API 和数据校验建议

为了避免后面 `snapshot` 被脏数据污染，建议从 Milestone 2 开始就引入运行时校验。

建议：

- TypeScript 类型继续复用 [render/editor/core/types.ts](/Users/mingyoungzhou/code/self/scenecraft-AI/render/editor/core/types.ts)
- 额外增加运行时 schema 校验层，例如 `zod`
- Route Handler 只接收校验通过的数据

最低限度要校验：

- `projectId` 格式
- 登录态
- `snapshot.id` 与 URL 上 `id` 的一致性策略
- 数组字段必须是数组
- 材质和贴图字段允许缺省但类型必须正确

## 9. Vercel 上线清单

- Vercel 项目已创建
- Neon 数据库已绑定
- 所有环境变量已配置到 Preview 和 Production
- `BETTER_AUTH_URL` 指向正式域名
- 邮件服务域名完成验证
- 对象存储 CORS 已配置
- 上传大小限制已配置
- 核心接口已做生产验证：
  - 注册
  - 登录
  - 新建项目
  - 保存项目
  - 加载项目
  - 上传素材

## 10. 建议的下一步

如果按“渐进式实现”来做，最好的起点不是先碰上传，而是先按下面顺序推进：

1. Drizzle + Neon 接入
2. better-auth 落库
3. `projects` 表
4. 新建/保存项目接口
5. 编辑器接保存

这是最短路径，能最快把产品从“纯前端编辑器”推进到“有账号、有数据、有项目资产归属”的真正可运营产品。
