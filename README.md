# dsh-ima-copilot

腾讯 IMA 是一个非常好的知识库应用，但是他们提供的skill版本针对公开知识库的检索方式只提供了基于文件标题的关键字检索，好一阵无语。为了补足在harness的这种知识库检索能力，基于tencent-ima-copilot-mcp迭代了对应的dsh版本。腾讯 IMA Copilot 的 DSH 原生工具插件。它把 IMA 知识库问答直接注册为 `ima_ask`，让 Agent 能按问题语义检索、归纳并返回引用资料，补足官方公开知识库skill能力主要依赖标题关键字搜索的限制。

本项目基于 [highkay/tencent-ima-copilot-mcp](https://github.com/highkay/tencent-ima-copilot-mcp) 的 IMA 接口实现改造为 DSH bundle：无需启动 MCP、FastMCP、Python 服务或常驻子进程，并提供 Web 配置界面。

![IMA Copilot 插件设置预览](./img_preview.png)

## 功能

- 注册原生工具 `ima_ask`，支持单知识库自动选择与多知识库显式选择。
- 返回回答正文及资料 ID、标题、知识库名称等引用信息。
- 在独立的“设置 → IMA Copilot”页面维护认证信息和知识库 ID。
- 每次调用前读取最新配置；修改配置后无需重启 DSH。
- 内置超时、并发限制、瞬时失败重试与取消处理。
- 凭证明文仅由 Host 侧 Credentials 服务读写，不回显到 Web 页面。

## 环境要求

- Node.js `^22.19.0` 或 `>=24.0.0`
- `@dsh-plugin/dsh-loader` `>=1.3.4 <2`
- dsh-loader 当前适配范围内、带 Web profile 的 DSH

本项目从 `0.2.0` 起只面向 dsh-loader 的稳定契约开发。Harness 的内部服务名、模块路径和版本差异由 loader adapter 负责，本插件不再安装、锁定或在 Client 清单中引用 Harness workspace 包。Host 能力通过 `ctx.dshLoader` 获取，Client UI 组合使用 loader 的 `ui-settings`、`ui-slots` 稳定子路径；`package.json.dshLoader` 记录采用的契约代际与最低 loader 版本。

插件使用独立 SemVer；当前版本为 `0.2.1`。旧的 `rc` 和 `alpha` 版本仅作为历史 Harness 直连版本保留。

> 本插件调用的是 IMA Web API，而非公开稳定 API；上游接口变化可能导致插件需要同步适配。

## 安装

本插件不会自动安装 dsh-loader。必须先手动安装
[`dsh-plugins/dsh-loader`](https://github.com/dsh-plugins/dsh-loader)，并将其挂载到同一个 Web profile，然后再安装本插件。

使用 npm 包安装 loader（推荐）：

```powershell
dsh plugin --profile web add @dsh-plugin/dsh-loader
```

也可以直接从 GitHub 仓库安装 loader：

```powershell
dsh plugin --profile web add https://github.com/dsh-plugins/dsh-loader.git
```

安装 loader 后再安装并启动本插件：

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
npm run verify
npm pack
dsh plugin --profile web add .\dsh-ima-copilot-0.2.1.tgz
dsh web
```

安装后重启 Web profile，使新增工具和设置卡生效。可用以下命令确认 bundle 已挂载：

```powershell
dsh --profile web --dump-config
```

输出中应包含 `ima-copilot`。

## 配置

打开独立的“设置 → IMA Copilot”页面，填写以下三项：

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

设置页通过插件自己的同源受限接口读写三个固定凭证引用。接口只返回 `configured`、`source` 和 `writable` 状态，不接受任意凭证名，也不读取或回显已保存的值。保存新的知识库 ID 时，请输入完整列表；新列表会替换旧列表。

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
npm run check
npm run check:loader-boundary
npm test
npm run build
npm run verify:package
```

也可以用一条命令执行类型检查、测试和构建：

```powershell
npm run verify
```

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
