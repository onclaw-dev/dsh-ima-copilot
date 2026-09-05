# Harness 跨版本适配发布准备

## 本地验证结论

- 开发基线保持 `dsh-v0.1.1-rc.2` / `0.1.1-rc.2` / `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`。
- `IMA-BASE-1`、legacy Client adapter、gateway Client adapter 和共享 Host adapter 已进入同一正式构建。
- `dsh-v0.1.0-rc.7`、`dsh-v0.1.0-rc.8`、`dsh-v0.1.1-rc.1`、`dsh-v0.1.1-rc.2`、`dsh-v0.1.2-alpha.2` 至 `alpha.5`、`dsh-v0.1.2-rc.1` 的隔离安装和已打包 Client smoke 使用同一 SHA-256：`c8f758887cd1b07f1131db8c406e2157bd24eb33ed04fa7ab340295960cb4c90`。
- `dsh-v0.1.2-alpha.1` 因精确 provider 未发布且存在 Node 24 Client Loader 缺陷，仅提供源码审计结论。
- `dsh-v0.1.3-alpha.1` 因精确 provider 未发布，仅提供源码审计结论。
- 当前环境没有可用 IMA/DSH 凭证变量，因此 live smoke 为 `not-run`；没有索取、打印或持久化凭证明文。

## 版本策略结论

2026-09-05 查询到的已发布版本为：`0.1.0`、`0.1.1-rc.2.ima.1`、`0.1.2-alpha.2.ima.1`、`0.2.0`、`0.2.1`。

版本规则现已收敛为独立的插件 SemVer，不再把 Harness 基线编码进版本号。`0.2.0` 是已经回退的 loader 兼容历史版本，`0.2.1` 是显式契约/接口族兼容发布线的起点。本次发布版本为 `0.2.2`，Git tag 为 `v0.2.2`，npm dist-tag 为 `latest`。

`package.json` 与 `package-lock.json` 已原子更新为 `0.2.2`。发布使用同一个最终 tarball 完成矩阵验证，不得覆盖已经发布的 `0.2.1`。

## 发布边界

用户已授权执行 Git commit/tag/push 与 `npm publish`。发布完成后在本节记录对应 commit、tag、npm dist-tag 和 registry 结果。
