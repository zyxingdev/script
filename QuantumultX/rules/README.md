# Quantumult X 分流规则

[返回 Quantumult X](../README.md) · [返回仓库首页](../../README.md)

## 规则列表

| 规则 | 用途 | 默认策略 |
| --- | --- | --- |
| [AI.list](AI.list) | OpenAI、Gemini、Claude、Grok、Muse、OpenRouter 等 AI 服务 | proxy |
| [AppleCN.list](AppleCN.list) | Apple 中国大陆服务及部分国内节点 | direct |
| [CN.list](CN.list) | 中国大陆网站域名 | direct |

## 添加到 Quantumult X

在配置文件的 `[filter_remote]` 中添加以下内容，或在 App 中添加远程分流资源：

```ini
https://raw.githubusercontent.com/zyxingdev/script/main/QuantumultX/rules/AI.list, tag=AI, force-policy=proxy, update-interval=86400, opt-parser=false, enabled=true
https://raw.githubusercontent.com/zyxingdev/script/main/QuantumultX/rules/AppleCN.list, tag=AppleCN, force-policy=direct, update-interval=86400, opt-parser=false, enabled=true
https://raw.githubusercontent.com/zyxingdev/script/main/QuantumultX/rules/CN.list, tag=CN, force-policy=direct, update-interval=86400, opt-parser=false, enabled=true
```

将 `proxy` 替换为配置中实际存在的代理策略或策略组名称。建议按上面顺序放置，让 AI 规则先于国内直连规则匹配；同时检查配置中其他规则的优先级。更新间隔单位为秒。

## 范围与维护

- AI 规则以服务专属域名为主，登录、共享 CDN 和嵌入其他网站的功能可能需要额外规则。X 网站内的 Grok 不会仅凭此列表单独识别。
- AppleCN 包含中国大陆专用域名和部分国内可用的 Apple 服务节点，并非全部 Apple 服务。
- CN 包含域名规则，不包含国内 IP 地址段；域名与服务归属可能随时间变化。
- 这些文件是手动整理的快照。QX 定期刷新的是本仓库文件，并不会自动同步上游变化；规则来源记录在各文件开头。

## 来源与许可证

各规则文件顶部列出参考来源。[CN.LICENSE](CN.LICENSE) 和 [CN-V2FLY.LICENSE](CN-V2FLY.LICENSE) 分别保留 CN 规则来源的 GPL-2.0 和 MIT 许可文本；AppleCN 来源的 AGPL-3.0 信息见文件头。其他来源及仓库许可范围见 [第三方记录](../../THIRD_PARTY_NOTICES.md) 和 [仓库许可](../../LICENSE)。
