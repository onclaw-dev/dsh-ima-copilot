# dsh-ima-copilot

腾讯 IMA 是一个非常好的知识库应用，但是他们提供的skill版本针对公开知识库的检索方式只提供了基于文件标题的关键字检索，好一阵无语。为了补足在harness的这种知识库检索能力，基于tencent-ima-copilot-mcp迭代了对应的dsh版本。腾讯 IMA Copilot 的 DSH 原生工具插件。它把 IMA 知识库问答直接注册为 `ima_ask`，让 Agent 能按问题语义检索、归纳并返回引用资料，补足官方公开知识库skill能力主要依赖标题关键字搜索的限制。

本项目基于 [highkay/tencent-ima-copilot-mcp](https://github.com/highkay/tencent-ima-copilot-mcp) 的 IMA 接口实现改造为 DSH bundle：无需启动 MCP、FastMCP、Python 服务或常驻子进程，并提供 Web 配置界面。

![IMA Copilot 插件设置预览](./img_preview.png)

## 功能

- 注册原生工具 `ima_ask`，支持单知识库自动选择与多知识库显式选择。
- 返回回答正文及资料 ID、标题、知识库名称等引用信息。
- 在“设置 → 插件 → IMA Copilot”中维护认证信息和知识库 ID。
- 每次调用前读取最新配置；修改配置后无需重启 DSH。
- 内置超时、并发限制、瞬时失败重试与取消处理。
- 凭证明文仅通过 DSH Credentials API 读写，不回显到 Web 页面。

## 环境要求

- Node.js `^22.19.0` 或 `>=24.0.0`
- DSH：以[兼容验证矩阵](#兼容验证矩阵)中“同包测试”为“通过”的 Release 为准
- Web profile 需要 `@deepseek-ai/dsh-client-ui-settings-plugins`

本仓库唯一的开发与类型检查基线仍为 DeepSeek Harness Release
[`dsh-v0.1.1-rc.2`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.1-rc.2) 和提交
[`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`](https://github.com/deepseek-ai/deepseek-harness/commit/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e)。它只是构建锚点，不再等同于插件唯一支持的 Harness 版本。`package.json.deepseekHarness` 继续记录这一基线，其他 Release 通过接口族档案和同一 tarball 矩阵验证。

### 跨版本兼容模型

开发与构建基线仍唯一固定为 `dsh-v0.1.1-rc.2`。插件通过内部契约 `IMA-BASE-1` 隔离 Harness 接口差异：旧版 Client 使用 `connection.api.credentials`，新版使用 `remote.credentials`，运行时按完整能力形状选择协议，不比较版本字符串。Host 的凭证、设置和工具生命周期经同一结构适配层归一化。

完整身份、接口差异和证据见 [兼容档案](./docs/harness-interface-contract-audit.md)，机器事实以 [`patch/index.json`](./patch/index.json) 及各 tag 的 `verification.json` 为准。

### 兼容验证矩阵

最后审计日期：2026-09-05。同包测试使用同一个未改写 tarball；SHA-256 记录在包外的逐 tag 机器验证档案中，避免发布包记录自身摘要。

| DeepSeek Harness Release | Commit | 接口族 / Client 适配 | 源码审计 | 精确 npm 包 | 同包测试 | Live smoke | 结论与备忘 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `dsh-v0.1.0-rc.7` | `99f6f02fecdb` | `IMA-HIF-1` / legacy | 通过 | 可用 | 通过 | 未执行 | 已验证 |
| `dsh-v0.1.0-rc.8` | `141eb6fef834` | `IMA-HIF-1` / legacy | 通过 | 可用 | 通过 | 未执行 | 已验证 |
| `dsh-v0.1.1-rc.1` | `528c682e0616` | `IMA-HIF-1` / legacy | 通过 | 可用 | 通过 | 未执行 | 已验证 |
| `dsh-v0.1.1-rc.2` | `b150a551b8d4` | `IMA-HIF-1` / legacy | 通过 | 可用 | 通过 | 未执行 | 已验证；当前开发基线 |
| `dsh-v0.1.2-alpha.1` | `cd5ef8148158` | `IMA-HIF-2` / gateway | 通过 | 不完整 | 不可执行 | 未执行 | 仅源码审计；Node 24 Client Loader 缺陷，排除运行时支持 |
| `dsh-v0.1.2-alpha.2` | `0a53fb55bea1` | `IMA-HIF-3` / gateway | 通过 | 可用 | 通过 | 未执行 | 已验证 |
| `dsh-v0.1.2-alpha.3` | `dd6322d604e0` | `IMA-HIF-3` / gateway | 通过 | 可用 | 通过 | 未执行 | 已验证 |
| `dsh-v0.1.2-alpha.4` | `4e84901e6471` | `IMA-HIF-3` / gateway | 通过 | 可用 | 通过 | 未执行 | 已验证 |
| `dsh-v0.1.2-alpha.5` | `db6bdc3576c2` | `IMA-HIF-3` / gateway | 通过 | 可用 | 通过 | 未执行 | 已验证 |
| `dsh-v0.1.2-rc.1` | `a66e47020478` | `IMA-HIF-3` / gateway | 通过 | 可用 | 通过 | 未执行 | 已验证 |
| `dsh-v0.1.3-alpha.1` | `d347e703908d` | `IMA-HIF-3` / gateway | 通过 | 不完整 | 不可执行 | 未执行 | 仅源码审计；不得声明 registry 安装支持 |

“同包测试通过”表示精确 Release 依赖、无跨 Release 混装、Client boot graph、适配器选路及 Host 契约测试均通过；不代表使用真实 IMA 凭证完成了在线调用。只有环境中已有有效凭证和 Web profile 时才执行 Live smoke。

### 插件版本策略

- 插件版本从跨版本契约适配线 `0.2.1` 开始独立迭代，使用普通 SemVer，例如 `0.2.1`、`0.2.2`、`0.3.0`；不再把某个 Harness 版本编码进插件版本号。
- `0.2.0` 是历史上的 `dsh-loader` 兼容版本；该方案已经回退，不再作为后续实现或版本规则的基础。
- `0.2.1` 是回退 loader 后、采用显式契约与接口族适配方案的版本线起点。后续兼容修复顺序递增 patch 版本；插件能力或兼容策略发生向后兼容扩展时递增 minor，破坏插件公开契约时递增 major。
- 当前插件版本为 `0.2.2`。npm 版本和 Git tag 不得覆盖；发布前必须查询目标版本尚未被占用。
- Git tag 使用 `v<plugin-version>`，例如 `v0.2.2`。Harness 支持范围以本表和机器档案为准，不由插件版本字符串推断。

> 本插件调用的是 IMA Web API，而非公开稳定 API；上游接口变化可能导致插件需要同步适配。

## 安装

安装 npm 当前默认版本：

```powershell
dsh plugin --profile web add dsh-ima-copilot
dsh web
```

使用 GitHub 地址进行安装：

```powershell
dsh plugin --profile web add https://github.com/onclaw-dev/dsh-ima-copilot.git
dsh web
```


从源码或本地打包文件安装：

```powershell
npm ci
npm run link:harness -- <本地 DSH 仓库路径>
npm run verify
npm pack
dsh plugin --profile web add .\dsh-ima-copilot-<version>.tgz
dsh web
```

安装后重启 Web profile，使新增工具和设置卡生效。可用以下命令确认 bundle 已挂载：

```powershell
dsh --profile web --dump-config
```

输出中应包含 `ima-copilot`。

## 配置

打开“设置 → 插件 → IMA Copilot”，填写以下三项：

| 字段 | DSH 凭证引用 | 说明 |
| --- | --- | --- |
| X-Ima-Cookie | `IMA_X_IMA_COOKIE` | IMA 请求的完整 Cookie |
| X-Ima-Bkn | `IMA_X_IMA_BKN` | IMA 请求头中的业务密钥 |
| 知识库 ID | `IMA_KNOWLEDGE_BASE_IDS` | 每行一个 ID，或使用逗号分隔 |

### 获取认证信息

1. 登录 [IMA Copilot](https://ima.qq.com)。
2. 打开浏览器开发者工具的 Network（网络）面板。
3. 在 IMA 中发送一条消息，找到 `/cgi-bin/assistant/qa` 请求。
4. 从同一个请求的原始 Request Headers 中复制完整的 `x-ima-cookie` 和 `x-ima-bkn`，并在设置页同时更新；不要复制包含 `…` 的截断摘要值。
5. 在目标知识库页面找到 `init_session` 请求，从请求体读取 `knowledge_base_id`。

设置页只读取 `configured`、`source` 和 `writable` 状态，不读取或回显已保存的值。保存新的知识库 ID 时，请输入完整列表；新列表会替换旧列表。

## 工具说明

### `ima_ask`

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `question` | 是 | 要向 IMA 知识库提出的非空问题 |
| `knowledgeBaseId` | 否 | 目标知识库 ID；配置多个知识库时必填，且必须位于配置列表中 |

返回示例：

```json
{
  "answer": "回答正文",
  "references": [
    {
      "id": "资料 ID",
      "title": "资料标题",
      "knowledgeBase": "知识库名称"
    }
  ]
}
```

未完成配置、知识库列表为空或选择了列表外的 ID 时，工具会在访问 IMA 前失败并给出配置提示。

## 运行机制

一次 `ima_ask` 调用会：

1. 从 DSH credential provider 读取最新 Cookie、Bkn 和知识库 ID 列表。
2. 校验配置并确定目标知识库。
3. 刷新 IMA token，创建一次性 IMA session 并请求答案。
4. 解析 SSE 回答与引用，随后释放并发许可。

插件不会保留 IMA 会话或认证前置状态，因此不支持跨调用的 IMA 对话历史。默认运行参数定义在 [cordis.patch.yml](./cordis.patch.yml)：请求超时 300 秒、瞬时失败重试 3 次、并发上限 1。

## 开发与验证

```powershell
npm ci
npm run link:harness -- <本地 DSH 仓库路径>
npm run check
npm test
npm run build
npm run verify:package
npm run check:harness-boot
npm run verify:matrix
```

当前 `0.1.1-rc.2` 的 DSH 开发包可由上述精确提交的本地 DSH 源码提供。链接脚本不会把 monorepo 根目录冒充某个 workspace 包；它会校验提交后，分别链接插件实际使用的包。链接完成后也可以用一条命令执行类型检查、测试和构建：

```powershell
npm run verify
```

`npm run verify:matrix` 只构建并准备隔离矩阵；`npm run verify:matrix:install` 会联网安装每个 tag 的精确 provider，并验证所有 fixture 使用同一个未改写 tarball。真实环境验证仍使用 `npm run verify:live`，缺少既有有效凭证时应记录为未运行，不能据此提升兼容声明。

在 Web profile 已配置有效凭证后，可执行真实连通性测试。该命令不会输出凭证明文或答案正文：

```powershell
npm run verify:live
```

## 已知限制

- IMA Web API 不是公开稳定 API，上游字段、鉴权或 SSE 格式变化时可能需要更新插件。
- token 刷新结果只在当前调用内使用；认证失效后需重新获取 Cookie 与 Bkn。
- 设置页采用 write-only 凭证引用，不能展示已保存的知识库 ID 明文。
- Workflow Designer 可发现并配置原生 `ima_ask`；是否支持 Live Invoke 取决于 Designer 版本。

## 来源与许可证

IMA 请求及响应解析逻辑源自 [tencent-ima-copilot-mcp](https://github.com/highkay/tencent-ima-copilot-mcp)，本仓库将其适配为 DSH 原生 bundle/plugin。项目继承并采用 [MIT License](./LICENSE)。

DSH 是 DeepSeek Harness 的生态简称。本项目是社区插件，与腾讯 IMA 或 DeepSeek 官方均无隶属或背书关系。
