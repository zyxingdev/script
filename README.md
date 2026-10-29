# script

个人自用的用户脚本、Quantumult X 重写片段和 Stash 覆写，按运行环境分类存放。

## 资源导航

| 分类 | 项目 | 用途 | 使用说明 |
| --- | --- | --- | --- |
| 用户脚本 | [AI 网页总结助手 Pro](Scripts/AI网页总结助手Pro.user.js) | 使用 AI 总结网页，支持问答和导出 | [脚本目录](Scripts/README.md#ai-网页总结助手-pro) |
| 用户脚本 | [Cosmos Enhanced for wBlock](Scripts/cosmos-enhanced-wblock.user.js) | 小宇宙音频与封面下载、搜索及倍速调节 | [脚本目录](Scripts/README.md#cosmos-enhanced-for-wblock) |
| 用户脚本 | [Cloudflare Checkbox Helper](Scripts/cf-checkbox-helper.user.js) | 尝试点击可访问的验证复选框，不保证通过 | [安装与限制](Scripts/docs/cf-checkbox-helper.md) |
| Quantumult X | [AI、AppleCN 和国内网站分流规则](QuantumultX/rules/README.md) | 按域名分流 AI、Apple 中国服务和国内网站 | [订阅与策略](QuantumultX/rules/README.md) |
| Quantumult X | [京东去广告](QuantumultX/JD/JD_remove_ads.QX.snippet) | 京东 iOS 开屏及部分横幅广告过滤 | [安装与诊断](QuantumultX/JD/README.md) |
| Stash | [Bilibili 去广告](Stash/Bilibili/Bilibili_remove_ads.stoverride) | 去广告，并调整历史记录相关域名处理 | [安装与说明](Stash/Bilibili/README.md) |
| Stash | [Google 重定向](Stash/Google/Google.stoverride) | 搜索与地图请求从 `.cn` 重定向到 `.com` | [安装与说明](Stash/Google/README.md) |

安装地址、订阅链接及各项目限制见对应使用说明。

## 目录结构

```text
.
├── Scripts/                # 用户脚本索引与脚本文件
│   └── docs/               # 单个用户脚本的详细说明
├── QuantumultX/            # Quantumult X 资源索引
│   ├── JD/                 # 京东正式规则、诊断脚本及说明
│   └── rules/              # AI、AppleCN 和国内网站分流规则
├── Stash/                  # Stash 资源索引
│   ├── Bilibili/           # Bilibili 去广告覆写及说明
│   └── Google/             # Google 重定向覆写及说明
├── LICENSE                 # 本仓库许可范围
├── LICENSES/               # 许可证文本
└── THIRD_PARTY_NOTICES.md   # 第三方来源与本地修改记录
```

## 来源与许可证

本仓库包含原创说明、本地适配、第三方派生文件及远程资源引用。由 zyxingdev 新增的说明文字和本地适配改动，在不覆盖第三方材料原有权利的前提下，按 Apache-2.0 许可提供；第三方材料保留各自的许可证和归属要求。

- [许可范围](LICENSE) · [Apache-2.0 全文](LICENSES/Apache-2.0.txt)
- [第三方来源、许可证及修改记录](THIRD_PARTY_NOTICES.md)

## 使用须知

这些脚本和配置用于个人学习和自用。使用前请确认目标服务条款、客户端规则、所在地区法律及上游许可证要求。具体安装条件和已知限制以各项目说明为准。
