# 用户脚本

[返回仓库首页](../README.md)

本目录存放浏览器用户脚本。各脚本的运行环境与权限需求不同，请按对应说明安装。

## 脚本列表

| 脚本 | 运行环境 | 用途 |
| --- | --- | --- |
| [AI 网页总结助手 Pro](AI网页总结助手Pro.user.js) | 用户脚本管理器 | 网页总结、问答和导出 |
| [Cosmos Enhanced for wBlock](cosmos-enhanced-wblock.user.js) | wBlock 用户脚本 | 小宇宙音频与封面下载、搜索及倍速调节 |
| [Cloudflare Checkbox Helper](cf-checkbox-helper.user.js) | 用户脚本管理器；含 macOS Safari 安装说明 | 尝试点击可访问的 Cloudflare 验证复选框 |

## AI 网页总结助手 Pro

可切换 Google Gemini、DeepSeek、智谱 GLM 或自定义兼容 API，支持侧栏、多语言、问答和导出。使用前需在脚本管理器中配置所选服务的 API Key。

[脚本源码](AI网页总结助手Pro.user.js) · [安装／更新地址](https://raw.githubusercontent.com/zyxingdev/script/main/Scripts/AI%E7%BD%91%E9%A1%B5%E6%80%BB%E7%BB%93%E5%8A%A9%E6%89%8BPro.user.js)

## Cosmos Enhanced for wBlock

基于 [LGiki/cosmos-enhanced](https://github.com/LGiki/cosmos-enhanced) 移植为 wBlock 用户脚本，保留小宇宙音频与封面下载、ListenNotes 搜索和播放器倍速调节功能。

[脚本源码](cosmos-enhanced-wblock.user.js) · [安装／更新地址](https://raw.githubusercontent.com/zyxingdev/script/main/Scripts/cosmos-enhanced-wblock.user.js)

上游采用 MIT License，来源及本地修改说明见 [第三方记录](../THIRD_PARTY_NOTICES.md)。

## Cloudflare Checkbox Helper

尝试自动点击脚本可访问的 Cloudflare 验证复选框，每个实例最多点击一次。不绕过验证，也不保证通过；尚未在 macOS Safari 真实验证页面实测。

[脚本源码](cf-checkbox-helper.user.js) · [安装地址](https://raw.githubusercontent.com/zyxingdev/script/main/Scripts/cf-checkbox-helper.user.js) · [安装、工作方式与限制](docs/cf-checkbox-helper.md)

## 来源与许可证

各文件的来源和许可范围见 [仓库许可说明](../LICENSE) 及 [第三方记录](../THIRD_PARTY_NOTICES.md)。
