# Repository Agent Instructions

本文件适用于整个 `dsh-ima-copilot` 仓库。

## 跨版本兼容原则

- 本项目使用“稳定内部契约 + 原生接口族 + 能力适配器”支持多个 DeepSeek Harness 不可变 Release，不再使用 `dsh-loader` 做兼容。
- `0.2.0` 是已经回退的 loader 兼容历史版本。不得恢复其 loader 适配逻辑，也不得把它作为新实现的复制来源。
- 业务代码只依赖 `IMA-BASE-1`。原始 Harness context、Remote envelope、品牌类型、tag、HIF 和 adapter 标识只能存在于 `src/compat/` 或兼容审计工具中。
- 运行时必须按完整能力形状选择 adapter；不得使用版本字符串、npm dist-tag、环境变量或不同构建产物选择接口实现。
- 相同原生调用面必须复用同一 adapter。只有插件实际使用的方法、参数、返回值、错误语义或生命周期发生变化时才建立新 HIF。
- 正式包只允许一个 Host 入口、一个 Client 入口和一个 Client module ID。所有支持的 adapter 必须进入同一 tarball。

## 开发基线、审计范围与支持范围

以下概念必须分别维护，不得混用：

| 概念 | 当前含义 | 事实来源 |
| --- | --- | --- |
| 开发基线 | 日常安装、类型检查和构建锚定的唯一 Harness Release | `package.json.deepseekHarness` |
| 审计范围 | 已完成不可变 tag、commit 和 IMA 调用面源码审查的 Release | `patch/index.json` 与逐 tag `manifest.json`、`interface.json` |
| 正式支持范围 | 使用同一个正式 tarball、目标精确依赖且无跨 Release 混装完成验证的 Release | 逐 tag `dependencies.json`、`verification.json` 与生成审计报告 |

- 本项目不自动跟随 Harness 分支、`latest`、`next`、`alpha` 或其他浮动引用。
- `package.json.deepseekHarness` 必须记录唯一开发基线的 `release`、根 `version`、完整 `commit` 和官方 `repository`。
- 当前开发基线以 `package.json.deepseekHarness` 为准。README 对开发基线的描述必须与其完全一致，但不能把开发基线误写为唯一支持版本。
- 一个 Release 可以“已源码审计”但不“正式支持”。精确 provider 未发布、Loader 在 adapter 运行前失败或同包矩阵未通过时，不得声称可安装或受支持。

## 兼容事实库与 README 矩阵

- `patch/` 是兼容性唯一机器事实库，`cordis.patch.yml` 只负责 Host 挂载，不承载版本分支。
- 每个审计 tag 必须包含：
  - `manifest.json`：tag、根 version、完整 commit、开发基线标记、contract、HIF 和 adapter；
  - `dependencies.json`：直接相关的精确 DSH 包、registry 可复现状态和缺失项；
  - `interface.json`：相对前一 tag 的 IMA 调用面差异及源码证据；
  - `verification.json`：`audited`、`registry`、`packageVerification`、`liveSmoke` 四个独立状态和原因。
- `docs/harness-interface-contract-audit.md` 必须由事实库确定性生成，不得手工维护另一套结论。
- README 必须保留逐 Harness Release 的兼容验证表，至少列出 Release、commit、HIF/adapter、源码审计、registry、同包测试、live smoke 和备忘。
- README 表格只能根据已经通过 `npm run check:compat` 的事实库更新。新增 tag、状态变化或 tarball digest 变化时，必须同步表格；不得只改 README 而不改机器记录。
- `not-run`、`unavailable` 和 `failed` 必须原样披露，不能折算为“兼容”。Live smoke 未执行时尤其不得省略该列。

## 审查新 Harness Release

用户要求检查、升级或适配 Harness，或发现新版行为不兼容时：

1. 只从 DeepSeek Harness 官方 GitHub Releases、不可变 Git 对象和 npm registry 获取版本事实。
2. 固定 Release tag、完整 commit SHA、根 version、Node engine 和插件相关 workspace 包版本。
3. 从上一已审计 tag 到候选 tag 审查完整 diff，但只据本项目实际消费面决定 HIF：
   - Host credentials、settings、tools 与 Cordis 生命周期；
   - Client Connection、Gateway Remote、slots 和 settings plugins；
   - Remote 参数、结果、错误语义；
   - Client provider boot graph、bundle 注册、manifest 与 Cordis patch。
4. 先判断候选 tag 是否复用现有 HIF/adapter；不能因为 tag 不同就复制实现。
5. 逐个查询所需 `@deepseek-ai/dsh-*` 精确版本。任何必要包缺失时，将 registry/package 状态记为 `unavailable`，不得借用其他 Release。
6. 更新机器档案、validator 和生成文档，再运行同 tarball 矩阵。只有完整通过后才能更新 README 的“已验证”结论。
7. 审计新 Release 默认不改变唯一开发基线。只有明确决定采用新构建基线时，才原子更新 `package.json.deepseekHarness`、全部精确开发依赖和 lockfile。

## DSH 包与 lockfile 规则

- 所有用于开发和类型检查的直接 `@deepseek-ai/dsh-*` 包必须来自同一个 Harness Release，并使用精确版本；禁止 `^`、`~`、`*`、Git 分支、`latest` 或 `next`。
- 当前直接相关的开发包至少包括：
  - `@deepseek-ai/dsh-api-remotes`；
  - `@deepseek-ai/dsh-client-connection`；
  - `@deepseek-ai/dsh-client-ui-renderer`；
  - `@deepseek-ai/dsh-client-ui-settings-plugins`；
  - `@deepseek-ai/dsh-client-ui-slots`；
  - `@deepseek-ai/dsh-credentials`；
  - `@deepseek-ai/dsh-settings`；
  - `@deepseek-ai/dsh-tools`。
- HIF 专属 DSH 包不得作为生产 `dependencies` 或精确版本 `peerDependencies`，否则会迫使其他 Harness Release 安装错误版本。生产代码应通过结构契约接收宿主能力。
- 如果确需新增 Host 运行时 import，必须先证明它在所有正式支持 HIF 中是同一公共契约，并重新执行完整矩阵；不能通过打包或 polyfill Harness provider 规避。
- 采用新开发基线前逐包执行 `npm view <package>@<exact-version> version`。任何一个缺失即停止基线迁移。
- 必须提交并使用 `package-lock.json`。CI 和可重复验证使用 `npm ci`，不得删除 lockfile 解决冲突。
- 检查直接及相关传递 DSH 包的实际解析版本。上游 workspace 范围导致跨 Release 混装时，矩阵 fixture 必须用目标 checkout 派生的精确 overrides 固定；不得忽略混装结果。

## 适配与验证流程

完成兼容实现或新增 tag 后，至少执行：

1. `npm ci`
2. `npm run check:compat`
3. `npm run check:boundaries`
4. `npm run check`
5. `npm test`
6. `npm run build`
7. `npm run check:client-bundle`
8. `npm run check:declarations`
9. `npm run check:package-boundary`
10. `npm run verify:package`
11. `npm run check:harness-boot`
12. `npm run verify:matrix:install`

矩阵验证必须：

- 只 build/pack 一次，并记录 SHA-256；
- 为每个 registry 可复现 tag 创建无共享 `node_modules`、缓存或本地链接的隔离 fixture；
- 校验 checkout HEAD 等于档案完整 commit；
- 安装目标 Release 的精确 provider，并拒绝直接或传递 DSH 包混装；
- 从同一个已安装 Client bundle 验证 boot graph 和 legacy/gateway adapter 选路；
- 将同一个 digest 写入所有通过的 `packageVerification` 证据。

如果环境中已有用户提供的有效凭证和 Web profile，再运行 `npm run verify:live`；不得索取、输出或提交凭证明文。没有环境时记录 `not-run`，不视为其他验证失败。

任何必需验证失败时，不得把对应 Release 标为已支持，也不得声称准备发布。包内容不得包含上游 checkout、`patch/`、OpenSpec、测试 fixture、凭证、缓存或本地链接。

## 插件版本与 Git tag

- 插件版本从 `0.2.1` 起独立于 Harness 版本维护，使用标准 SemVer；不再采用 `<harness-version>.ima.<revision>`。
- `0.2.0` 仅表示已回退的历史 loader 兼容版本；后续版本不得从该实现分叉或复用其兼容策略。
- `0.2.1` 是显式契约/接口族兼容发布线的起点。后续规则：
  - 同一公开契约下的修复或新增 Harness tag 适配，递增 patch，例如 `0.2.2`；
  - 向后兼容的插件能力或兼容框架扩展，递增 minor，例如 `0.3.0`；
  - 破坏插件公开配置、工具或导出契约，递增 major。
- 版本号不表达具体 Harness Release。支持范围必须从 README 矩阵和 `patch/` 查询。
- 修改版本前必须查询 `npm view dsh-ima-copilot versions --json`，用 SemVer 工具确认候选版本合法、未发布且高于所有既有版本。
- npm 版本不可覆盖。当前 `0.2.1` 已被占用，因此下一次实际发布通常应从 `0.2.2` 开始；若 registry 状态变化，以实时查询结果为准。
- Git tag 使用 `v<plugin-version>`，例如 `v0.2.2`。tag 注释或 Release notes 必须包含兼容矩阵摘要、唯一开发基线、正式 tarball digest、验证结果和未执行项。

## 自主范围与发布边界

- Agent 可以自主审计官方 Release/npm 元数据、维护兼容档案与 adapter、修改本仓库并运行本地验证。
- 不得仅因上游出现新 Release 就改变开发基线或插件版本；先完成审计并说明是否需要新 HIF。
- `npm publish`、Git commit/tag/push、GitHub Release 或任何远端修改，必须获得用户对该具体动作的明确授权。
- 未获授权时可以准备本地版本变更和 Release notes，但必须停在本地已验证状态。

## 交付报告

完成兼容审计或实现后，至少报告：

- 唯一开发基线的 Release、version、commit 是否变化；
- 审计了哪些 tag，各自 HIF/adapter 与接口变化；
- 哪些 tag 通过同包验证，哪些仅源码审计或被排除；
- 正式 tarball SHA-256，以及是否所有通过项使用同一 digest；
- registry、直接/传递 DSH 包是否存在缺失或混装；
- 执行过的测试及结果，live smoke 等未执行项及原因；
- 插件候选版本与建议 Git tag；
- 仍需用户授权的发布动作或阻塞风险。
