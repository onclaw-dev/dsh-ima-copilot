# DeepSeek Harness 兼容档案（机器记录派生）

> 本文件由 `scripts/generate-harness-audit.mjs` 从 `patch/` 生成，请勿直接编辑。

- 唯一内部契约：`IMA-BASE-1`
- 开发基线：`dsh-v0.1.1-rc.2` / `0.1.1-rc.2` / `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`
- Client provider 注入：`@deepseek-ai/dsh-client-connection`、`@deepseek-ai/dsh-client-ui-settings-plugins`

## 逐 Tag 状态

| Harness tag | commit | HIF | adapter | audited | registry | package | live |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `dsh-v0.1.0-rc.7` | `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca` | `IMA-HIF-1` | `IMA-ADAPTER-LEGACY` | passed | passed | passed | not-run |
| `dsh-v0.1.0-rc.8` | `141eb6fef83422698aef7a981029e843e8161534` | `IMA-HIF-1` | `IMA-ADAPTER-LEGACY` | passed | passed | passed | not-run |
| `dsh-v0.1.1-rc.1` | `528c682e061696f5a160f363f236ecbf53cbd006` | `IMA-HIF-1` | `IMA-ADAPTER-LEGACY` | passed | passed | passed | not-run |
| `dsh-v0.1.1-rc.2` | `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e` | `IMA-HIF-1` | `IMA-ADAPTER-LEGACY` | passed | passed | passed | not-run |
| `dsh-v0.1.2-alpha.1` | `cd5ef8148158c3a752a658978873241fdf8e2bbc` | `IMA-HIF-2` | `IMA-ADAPTER-GATEWAY` | passed | unavailable | unavailable | not-run |
| `dsh-v0.1.2-alpha.2` | `0a53fb55bea101816fa226bb964ae2bed71c343b` | `IMA-HIF-3` | `IMA-ADAPTER-GATEWAY` | passed | passed | passed | not-run |
| `dsh-v0.1.2-alpha.3` | `dd6322d604e00eec1ba5e0c8541159906a21094a` | `IMA-HIF-3` | `IMA-ADAPTER-GATEWAY` | passed | passed | passed | not-run |
| `dsh-v0.1.2-alpha.4` | `4e84901e6471b79ec0338099867ebb4606d12bb5` | `IMA-HIF-3` | `IMA-ADAPTER-GATEWAY` | passed | passed | passed | not-run |
| `dsh-v0.1.2-alpha.5` | `db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5` | `IMA-HIF-3` | `IMA-ADAPTER-GATEWAY` | passed | passed | passed | not-run |
| `dsh-v0.1.2-rc.1` | `a66e4702047846cdaa10c66c9d3df3951f5ea70d` | `IMA-HIF-3` | `IMA-ADAPTER-GATEWAY` | passed | passed | passed | not-run |
| `dsh-v0.1.3-alpha.1` | `d347e703908d0406b7a7ef80e3a0e594d86b2215` | `IMA-HIF-3` | `IMA-ADAPTER-GATEWAY` | passed | unavailable | unavailable | not-run |

## 接口差异

- `dsh-v0.1.0-rc.7`：Initial audited legacy IMA surface.
- `dsh-v0.1.0-rc.8`：Plugin-consumed Host and Client shapes unchanged.
- `dsh-v0.1.1-rc.1`：Plugin-consumed Host and Client shapes unchanged.
- `dsh-v0.1.1-rc.2`：Machine-readable development baseline; plugin-consumed shapes unchanged.
- `dsh-v0.1.2-alpha.1`：Credentials moved from connection.api.credentials to generated remote.credentials positional methods and direct results.；Client Loader has a documented Node 24 defect; source audit only.
- `dsh-v0.1.2-alpha.2`：Public settingsNamespace helper removed; raw namespace strings accepted.；Gateway Remote failure vocabulary changed while normalized credential semantics stayed equivalent.
- `dsh-v0.1.2-alpha.3`：Plugin-consumed credential, settings, tools, slots, and manifest shapes unchanged.
- `dsh-v0.1.2-alpha.4`：Slots gained unrelated capabilities; IMA settings slot contract unchanged.
- `dsh-v0.1.2-alpha.5`：Plugin-consumed surface only changed Release identity.
- `dsh-v0.1.2-rc.1`：Plugin-consumed surface only changed Release identity.
- `dsh-v0.1.3-alpha.1`：Plugin-consumed IMA surface remains in IMA-HIF-3; exact npm provider set is unpublished.

## 状态语义

- `audited` 仅证明不可变源码和 IMA 调用面已审查。
- `registry` 仅证明精确直接包可获得。
- `package` 只有同一正式 tarball 在隔离依赖中通过后才能为 `passed`。
- `live` 需要已有有效凭证与 Web profile；未运行不会阻止源码审计，但不能提升正式支持声明。

`dsh-v0.1.2-alpha.1` 因 Node 24 Client Loader 缺陷仅保留源码审计；registry 不完整的版本不列入正式安装支持。
