# Bilibili 去广告（Stash）

[Bilibili_remove_ads.stoverride](Bilibili_remove_ads.stoverride) 是面向 Stash 的 Bilibili 去广告覆写。本地版本基于 kokoryh 的规则调整，在保留 `app.bilibili.com` 去广告处理的同时，让 `grpc.biliapi.net` 保持直连，避免历史记录页面因整域 MitM 出现明显加载延迟。

## 安装

在 Stash 中添加以下覆写链接：

```text
https://raw.githubusercontent.com/zyxingdev/script/main/Stash/Bilibili/Bilibili_remove_ads.stoverride
```

启用覆写后，请确认 Stash 已安装并信任 MitM 证书，然后彻底结束 Bilibili App 并重新打开。若此前启用过其他 Bilibili 覆写，请避免同时启用重复规则。

## 本地调整

- 将自动更新地址改为本仓库 Raw 链接，避免上游刷新覆盖本地优化。
- 分类字段按 Stash 覆写格式设为 `去广告`。
- 移除 Loon 转换遗留的 `system`、`system_version`、`loon_version` 和生成日期字段。
- 取消对 `api.biliapi.com`、`app.biliapi.com`、`api.biliapi.net` 和 `app.biliapi.net` 的整域拒绝。
- `grpc.biliapi.net` 保持直连，避免 History gRPC 被整域 MitM 拖慢。
- 保留 `app.bilibili.com` MitM，用于首页 JSON 去广告及 gRPC 备用通道处理。
- 移除会重建“我的”页面并写入固定历史入口的 `account/mine` 响应改写。

## 注意事项

- 由于 `grpc.biliapi.net` 不再 MitM，直接走该域名的 ProtoBuf 去广告和空降助手处理不会执行；走 `app.bilibili.com` 备用通道时仍可处理。
- 规则依赖远程脚本提供者，第三方服务不可用时，对应功能可能失效。
- Bilibili 或 Stash 更新后，接口行为可能变化；如出现异常，请先停用覆写进行对照测试。

## 来源

- 原规则作者：kokoryh
- 转换及资源入口：[Kelee Script Hub](https://hub.kelee.one)
- Script Hub：[Script-Hub-Org/Script-Hub](https://github.com/Script-Hub-Org/Script-Hub)

本地修改不改变第三方材料原有的权利归属，详情见仓库根目录的 [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)。
