# Repository Agent Instructions

本文件适用于整个 `dsh-ima-copilot` 仓库。

## dsh-loader 兼容契约

- 本项目只面向 `@dsh-plugin/dsh-loader` 的公开稳定契约开发，不直接跟踪 DeepSeek Harness 的内部包版本。
- `package.json.dshLoader` 记录采用的契约代际和最低 loader 版本；README 必须与其一致。
- Host 侧所有 DSH 能力必须通过 `ctx.dshLoader` 访问，包括 services、settings、web 和模块级 dsh symbols。
- 仓库源码、声明、生成产物、清单、锁文件及文档不得出现真实 Harness 包名；Client 组合也必须使用 loader 稳定子路径。
- `package.json` 的 dependencies、devDependencies、peerDependencies 和 `dsh.client.inject` 只能声明 loader 或与 Harness 无关的公开包。
- `npm run check:loader-boundary` 是强制门禁；发现真实 Harness 包作用域字符串时必须失败。
- Client 侧不得依赖某一 Harness 版本的 connection/Remote RPC 形状。插件自有浏览器接口必须通过 `ctx.dshLoader.web` 注册，并保持窄权限、同源校验和秘密不回显。

## 版本管理

- 插件使用独立 SemVer，不再把 Harness 版本编码进插件版本。
- 修复使用 patch，向后兼容能力使用 minor，破坏性公共契约调整使用 major。
- Git tag 使用 `v<plugin-version>`，例如 `v0.2.0`。
- npm 版本不可覆盖或重复发布。修改版本前查询全部已发布版本，候选版本必须高于既有最高版本。
- 默认正式发布到 npm `latest`；预发布版本使用明确的 prerelease 版本和非 latest dist-tag。

## 适配与验证

1. loader 公共契约未变化时，不因 Harness 发布新版本修改本插件。
2. Harness 兼容问题优先确认是否属于 loader adapter 覆盖范围；不得在插件中重新引入 Harness 私有包依赖。
3. 每次依赖变更必须同步提交 `package-lock.json`，CI 使用 `npm ci`。
4. 发布前执行 `npm ci`、`npm run check`、`npm test`、`npm run build` 和 `npm run verify:package`。
5. 执行 loader 边界审计，确保整个仓库没有真实 Harness 包名、直接 DSH import/require，也没有打包本地 checkout、凭证、缓存或链接路径。
6. 兼容性发布应使用同一个 tgz 在至少两个 loader 支持的 Harness 版本上验证，不得按 Harness 版本分别构建插件。
7. 有用户提供的有效凭证和 Web profile 时再运行 `npm run verify:live`；不得索取、输出或提交凭证明文。

任何必需验证失败时，不得声称准备发布。

## 发布边界

- Agent 可以自主修改和验证本仓库，也可以只读检查 loader 与 Harness 契约。
- `npm publish`、创建 GitHub Release、推送 commit/tag、修改远端仓库或外部系统，必须获得用户对该动作的明确授权。
- 未获发布授权时，可以准备版本、发布说明和建议 tag，但必须停在本地已验证状态。
