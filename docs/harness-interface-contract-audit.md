# DeepSeek Harness 兼容档案（机器记录派生）

> 本文件由 `scripts/generate-harness-audit.mjs` 从 `patch/` 生成，请勿直接编辑。

- 唯一内部契约：`IMA-BASE-2`
- 开发基线：`dsh-v0.2.2-rc.1` / `0.2.2-rc.1` / `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`
- Client provider 注入：`@deepseek-ai/dsh-client-connection`、`@deepseek-ai/dsh-client-ui-settings`

## 接口族与兼容策略

| HIF | 版本范围 | Client 凭证 | Config | adapter composition |
| --- | --- | --- | --- | --- |
| `IMA-HIF-1` | `dsh-v0.1.0-rc.7` ～ `dsh-v0.1.1-rc.2` | legacy-envelope | static | `src/compat/client.ts#createLegacyCredentialsAdapter` + `src/config.ts#resolveConfig` |
| `IMA-HIF-2` | `dsh-v0.1.2-alpha.2` ～ `dsh-v0.1.6-alpha.2` | gateway-positional | static | `src/compat/client.ts#createGatewayCredentialsAdapter` + `src/config.ts#resolveConfig` |
| `IMA-HIF-3` | `dsh-v0.1.7-alpha.1` ～ `dsh-v0.2.2-rc.1` | gateway-positional | volatile | `src/compat/client.ts#createGatewayCredentialsAdapter` + `src/config.ts#resolveConfig` |

三族中的 Host `credentials.resolve`、`tools.register(ToolDefinition)`、工具输出渲染与 `AbortSignal` 调用面保持结构兼容；无需按 tag 分叉业务实现。

## 逐 Tag 状态

| Harness tag | commit | HIF | source | registry | package | bundle | runtime | live IMA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dsh-v0.1.0-rc.7` | `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca` | `IMA-HIF-1` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.0-rc.8` | `141eb6fef83422698aef7a981029e843e8161534` | `IMA-HIF-1` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.1-rc.1` | `528c682e061696f5a160f363f236ecbf53cbd006` | `IMA-HIF-1` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.1-rc.2` | `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e` | `IMA-HIF-1` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.2-alpha.2` | `0a53fb55bea101816fa226bb964ae2bed71c343b` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.2-alpha.3` | `dd6322d604e00eec1ba5e0c8541159906a21094a` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.2-alpha.4` | `4e84901e6471b79ec0338099867ebb4606d12bb5` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.2-alpha.5` | `db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.2-rc.1` | `a66e4702047846cdaa10c66c9d3df3951f5ea70d` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.3-alpha.1` | `d347e703908d0406b7a7ef80e3a0e594d86b2215` | `IMA-HIF-2` | passed | unavailable | unavailable | passed | not-run | not-run |
| `dsh-v0.1.3-alpha.2` | `82a5fd61a7cf5c293cec4bdff68f455398d685e9` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.5-alpha.1` | `5dda764ed3aa172535a7967b06ff95d9cbfe536a` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.5-alpha.2` | `b2e3b2a0125854567a4a5fcba75782e42fe84901` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.5-rc.1` | `183f08e9c6dde7e36cd2318eaee70b0da08fb35e` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.5-rc.2` | `fb2c4b9e698e30edb738bca4cf0618587db7d203` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.5-rc.3` | `a4c74a91e06b00fe0b0937bde982170c526cc842` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.6-alpha.1` | `0a15e36e7f82b6ed45af6fa9759f29b40dcd965d` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.6-alpha.2` | `ddefc45fbc7f8e46dd73185e68295696d1297887` | `IMA-HIF-2` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.7-alpha.1` | `c36a83ff6bb95e3f82cf79f9be7c724270a8aa61` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.7-alpha.2` | `00102833dfaee1da9f48a3a8eae9d34005a75218` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.7-rc.1` | `46a7f68b0922371ce7144b668b90e377d8e799f4` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.1.7-rc.2` | `477b4f420553e8a52c2fbccc464d7561b239c443` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.0-rc.1` | `4878cdabd87d4041bdaff61d04c966883b9fd07a` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.0-rc.2` | `639ed015397290b3745d163aafe02ffee4aa3f84` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.1-alpha.1` | `5badb15009ae1756c3afe0ae0cef1faafc290ccc` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.1-alpha.2` | `d743267388641bc76f17c45ce8b4c231aed1d32c` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.1-alpha.3` | `2fbf4359b82fb94c03dcce0b831660d87f12ea5c` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.1-alpha.4` | `86a402200d95fecef4529d969836f1fe13c6cb0d` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.1-alpha.5` | `1517a4dbca0a2789ff1d41ba439600f8547d23fa` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.1-rc.1` | `1600d8a1e140dcde43a1a0941940a0480712c011` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.1-rc.2` | `687f282e8625c6b8d11ff58211a90524be2e4317` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.1-rc.3` | `1f81c047fc48fa190a683e469daa699857e9afe8` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.1-rc.4` | `504a01a9578abc2c6f1fb896b1dc322c9fe24f66` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.1-rc.5` | `b830ec950faba0a46dda564be3e2d854afed94f1` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.2-alpha.2` | `f3803c96974ad4a94195fb97e5c637e9c2a3afe3` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.2-alpha.3` | `05b1cae8db6e674c5685101494d4eec24652424a` | `IMA-HIF-3` | passed | passed | passed | passed | not-run | not-run |
| `dsh-v0.2.2-rc.1` | `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db` | `IMA-HIF-3` | passed | passed | passed | passed | operator-passed | operator-passed |

## 状态语义

- `source` 仅证明不可变源码和 IMA 调用面已审查。
- `registry` 仅证明精确直接包可获得。
- `package` 只有同一正式 tarball 在隔离依赖中通过后才能为 `passed`。
- `bundle` 是合成 Context smoke，不等于真实 Harness 加载。
- `runtime` 只有实际 Harness Client/Host 加载后才能提升。
- `live IMA` 需要有效凭证；用户确认的现行基线记为 `operator-passed`。

`dsh-v0.1.2-alpha.1` 是环境契约明确排除项，不在本表中。`dsh-v0.1.3-alpha.1` 的不可变源码与 gateway bundle smoke 已通过，但其精确历史 npm 包未发布，因此不能声称完成 registry 安装验证。
