# script

个人脚本与配置片段。

## 内容

- `Bilibili_remove_ads.stoverride`: 哔哩哔哩去广告相关 Loon/Stash Override 配置，引用 kokoryh 的远程处理脚本。
- `WeatherKit/`: 基于 iRingo WeatherKit 的 Quantumult X 本地适配，用于修复 iOS 26.6 WeatherKit country 丢失导致的空气质量显示问题。

## 安装

可直接引用仓库中的 raw 文件地址。请按所用客户端的规则启用 Rewrite、Script 和 MitM，并自行确认目标 App 版本兼容性。

## 第三方来源与许可证

本仓库包含第三方脚本的派生版本、配置引用和本地适配代码。第三方来源、已确认许可证和未确认许可证的部分记录在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

- iRingo / NSRingo WeatherKit: 上游项目为 Apache-2.0 license，本仓库保留来源说明并记录本地修改。
- kokoryh Bilibili 脚本: 配置中保留原作者信息和远程脚本 URL；未在本次检查中确认到明确许可证，因此不将其声明为本仓库原创或重新授权内容。
- Script-Hub `echo-response.js`: 仅作为远程脚本提供方引用，未在本仓库内复制其源码。

本仓库中由 zyxingdev 新增的说明文字和本地适配改动，在不覆盖第三方材料原有权利的前提下，按 Apache-2.0 许可提供。第三方材料继续遵循其各自上游许可证或授权状态。

## 免责声明

这些脚本和配置仅用于个人学习和自用场景。使用前请确认所在地区法律、目标服务条款、客户端规则以及上游项目许可证要求。
