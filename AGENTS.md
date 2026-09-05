# Repository Agent Instructions

本文件适用于整个 `dsh-ima-copilot` 仓库。

## DeepSeek Harness 兼容基线

- 本项目不自动跟随 DeepSeek Harness 的分支、`latest`、`next` 或其他浮动版本。
- `package.json.deepseekHarness` 是经过验证的 Harness 兼容基线，必须同时记录：
  - `release`：上游不可变 Release tag，例如 `dsh-v0.1.2-alpha.2`；
  - `version`：该 Release 对应的 npm 版本，例如 `0.1.2-alpha.2`；
  - `commit`：Release 指向的完整 Git commit SHA；
  - `repository`：上游仓库地址。
- Git tag 用于标识和审计源码基线，npm 精确版本用于安装 monorepo 中实际发布的 workspace 包；不得使用 monorepo 根 Git URL 冒充某个 workspace npm 包。
- 插件 `version` 以经过验证的 Harness Release 版本为主线，并追加插件发布修订号：
  - Harness 为预发布版本时使用 `<harness-version>.ima.<revision>`，例如 `0.1.2-alpha.2.ima.1`；
  - Harness 为稳定版本时使用 `<harness-version>-ima.<revision>`，例如 `1.0.0-ima.1`；
  - 每采用一个新的 Harness 基线，插件修订号从 `1` 重新开始；
  - 同一 Harness 基线下仅修复插件自身时，只递增 `ima` 修订号，不改变 Harness 版本部分。
- npm 版本不可覆盖或重复发布。不得为了与 Harness 完全同名而复用已经发布的插件版本。
- 在首次切换到该版本规则前，先查询本插件已经发布的全部 npm 版本。若按 Harness 推导出的版本不高于既有最高版本，停止版本拟定并向用户报告迁移冲突；未经明确决定不得发布一个语义上的降级版本或擅自引入版本纪元。

当前基线以 `package.json.deepseekHarness` 为准。README 中记录的 Release、version 和 commit 必须与它一致。

## 何时跟进上游版本

当用户要求检查、升级或适配 Harness，或者发现当前插件在新版 Harness 中发生 API/行为不兼容时，Agent 应主动完成版本调研和兼容性审计。

1. 只从 DeepSeek Harness 官方 GitHub Releases 和 npm registry 获取版本信息。
2. 找出最新不可变 Release、完整 commit SHA、根版本及对应 npm workspace 包版本。
3. 不以发布时间、Git 分支 HEAD 或 npm dist-tag 单独判断版本新旧；`latest`、`next`、`alpha` 可能指向不同发布线。
4. 阅读从当前基线到候选 Release 的完整 changelog/diff，重点检查本项目实际使用的接口：
   - `@deepseek-ai/dsh-credentials`；
   - `@deepseek-ai/dsh-settings`；
   - `@deepseek-ai/dsh-tools`；
   - `@deepseek-ai/dsh-api-remotes/client`；
   - Client UI renderer、slots、settings plugins；
   - Cordis 注入、bundle patch、client manifest 和 Remote 调用契约。
5. 如果候选 Release 没有影响本项目的破坏性变化、必要安全修复或项目所需能力，默认继续冻结当前基线，不修改依赖或 lockfile。
6. 如果候选 Release 引入了必须跟进的破坏性变化、必要安全修复或用户明确要求采用的新能力，则将其作为一个新的兼容基线进行完整适配，不做单包试探性升级。

## DSH npm 包更新规则

- 所有直接使用的 `@deepseek-ai/dsh-*` 包必须来自同一个 Harness Release，并使用精确版本；禁止 `^`、`~`、`*`、`latest`、`next` 或分支引用。
- 升级必须原子完成：同时更新 `dependencies`、`devDependencies`、`peerDependencies`、`peerDependenciesMeta` 中相关约束，以及 `package-lock.json`。
- 当前直接相关的包至少包括：
  - `@deepseek-ai/dsh-api-remotes`；
  - `@deepseek-ai/dsh-client-ui-renderer`；
  - `@deepseek-ai/dsh-client-ui-settings-plugins`；
  - `@deepseek-ai/dsh-client-ui-slots`；
  - `@deepseek-ai/dsh-credentials`；
  - `@deepseek-ai/dsh-settings`；
  - `@deepseek-ai/dsh-tools`。
- 升级前逐个执行 `npm view <package>@<exact-version> version`，确认所有所需 workspace 包均已发布。任何一个缺失时停止升级，不得用其他版本或 dist-tag 补齐。
- 提交并使用 `package-lock.json`。CI 和可重复验证使用 `npm ci`；不得通过删除 lockfile 来解决依赖冲突。
- 检查 lockfile 中直接及相关传递 DSH 包的实际解析版本，避免混装不同 Release。若上游包自身的范围导致混装，先查明并解决，不得忽略。

## 适配和验证流程

采用新 Harness 基线时，按以下顺序执行：

1. 记录候选 Release tag、完整 commit、npm version 和 Release 链接。
2. 将上游仓库检出到该完整 commit，使用其声明的包管理器和 frozen lockfile 安装，并完成上游要求的构建。
3. 运行 `npm run link:harness -- <deepseek-harness-repository>`；脚本必须继续校验 commit 和 version，并只链接真实 workspace 目录。
4. 修复编译、运行时注入、Remote 契约和 UI API 的不兼容变化。
5. 一次性更新 `package.json.deepseekHarness`、所有直接 DSH 精确版本和 `package-lock.json`。
6. 更新 README 中的环境要求、兼容 Release、commit、安装和开发说明。
7. 验证 registry 安装路径：
   - `npm ci`
   - `npm run check`
   - `npm test`
   - `npm run build`
   - `npm run verify:package`
8. 验证精确源码路径：重新链接已构建的上游 checkout，然后运行 `npm run verify`。
9. 如果环境中已有用户提供的有效凭证和 Web profile，再运行 `npm run verify:live`；不得索取、输出或提交凭证明文。
10. 对比打包内容，确保没有把上游仓库、源码 checkout、凭证、缓存或本地链接写入发布包。

任何必需验证失败时，基线升级均未完成，不得声称兼容或准备发布。

## 版本和 Git tag

- 插件版本必须以当前兼容的 Harness Release 版本为前缀，并按本文件约定追加 `ima` 修订号。
- 修改版本前使用 SemVer 工具验证候选字符串合法，并确认其高于本插件已发布的所有版本。
- 采用新的 Harness 破坏性基线时，更新 Harness 版本部分并将 `ima` 修订号重置为 `1`。例如从 `0.1.2-alpha.2.ima.3` 迁移到 `0.1.3-alpha.1.ima.1`。
- 没有采用新的 Harness 基线时，不得仅因上游发布新版本而改变插件版本中的 Harness 部分。
- 每次发布都应能从 tag 直接看出插件版本；tag 使用：

  `v<plugin-version>`

  例如：`v0.1.2-alpha.2.ima.1`。
- tag 注释或发布说明必须包含完整 Harness commit SHA、Release 链接、精确 DSH npm 版本以及验证结果。
- 同一个 Harness 基线下的插件修复应递增 `ima` 修订号并创建新 tag，不得复用或覆盖既有 tag/npm 版本。

## 自主范围与发布边界

- Agent 可以自主检查官方 Release、npm 元数据、源码 diff，修改本仓库以完成兼容适配，并运行本地验证。
- Agent 不得仅因发现新 Release 就更新依赖；先应用本文件的采用条件并报告判断依据。
- `npm publish`、创建 GitHub Release、推送 commit/tag、修改远端仓库或向外部系统发送内容，必须获得用户对该发布动作的明确授权。
- 未获发布授权时，Agent 可以准备版本变更、发布说明和建议 tag，但必须停在本地已验证状态。

## 升级交付报告

完成一次基线审计或升级后，向用户报告：

- 原基线与候选/新基线的 Release、version、commit；
- 是否发现破坏性变化以及影响的具体接口；
- 更新了哪些 DSH npm 包，是否全部来自同一 Release；
- lockfile 是否存在混装；
- 执行过的测试及结果，未执行项目及原因；
- 插件新版本和建议 Git tag；
- 是否仍有阻塞发布的风险或外部操作待授权。
