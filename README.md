# script

个人使用的代理客户端配置和覆写，按客户端与资源类型分类存放。

## 目录结构

```text
.
├── QuantumultX/
│   └── JD/                 # 京东去广告重写
├── Stash/
│   ├── Bilibili/           # Bilibili 去广告覆写及说明
│   └── Google/             # Google 搜索与地图重定向
├── Scripts/                # 用户脚本
├── LICENSES/               # 第三方许可证副本
└── THIRD_PARTY_NOTICES.md  # 第三方来源与本地修改记录
```

## Quantumult X

### 京东去广告

- 文件：[JD_remove_ads.QX.snippet](QuantumultX/JD/JD_remove_ads.QX.snippet)
- 订阅地址：

```text
https://raw.githubusercontent.com/zyxingdev/script/main/QuantumultX/JD/JD_remove_ads.QX.snippet
```

启用 Rewrite 与 MitM、安装并信任证书后，强制结束京东 App，清除已缓存的开屏广告，再重新打开。

## Stash

### Bilibili 去广告

- 覆写：[Bilibili_remove_ads.stoverride](Stash/Bilibili/Bilibili_remove_ads.stoverride)
- 说明：[Stash/Bilibili/README.md](Stash/Bilibili/README.md)
- 订阅地址：

```text
https://raw.githubusercontent.com/zyxingdev/script/main/Stash/Bilibili/Bilibili_remove_ads.stoverride
```

该版本保留 `app.bilibili.com` 去广告处理，同时让 `grpc.biliapi.net` 直连，以避免历史记录加载缓慢。

### Google 搜索重定向

- 覆写：[Google.stoverride](Stash/Google/Google.stoverride)
- 说明：[Stash/Google/README.md](Stash/Google/README.md)
- 订阅地址：

```text
https://raw.githubusercontent.com/zyxingdev/script/main/Stash/Google/Google.stoverride
```

## 用户脚本

### AI 网页总结助手 Pro

- 脚本：[Scripts/AI网页总结助手Pro.user.js](Scripts/AI网页总结助手Pro.user.js)
- 更新地址：

```text
https://raw.githubusercontent.com/zyxingdev/script/main/Scripts/AI%E7%BD%91%E9%A1%B5%E6%80%BB%E7%BB%93%E5%8A%A9%E6%89%8BPro.user.js
```

可切换 Google Gemini、DeepSeek、智谱 GLM 或自定义兼容 API，为网页内容生成总结；支持侧栏、多语言、问答和导出。需在用户脚本管理器中配置所选服务的 API Key。

### Cosmos Enhanced for wBlock

- 脚本：[Scripts/cosmos-enhanced-wblock.user.js](Scripts/cosmos-enhanced-wblock.user.js)
- 更新地址：

```text
https://raw.githubusercontent.com/zyxingdev/script/main/Scripts/cosmos-enhanced-wblock.user.js
```

该脚本基于 [LGiki/cosmos-enhanced](https://github.com/LGiki/cosmos-enhanced) 移植为 wBlock 用户脚本，保留小宇宙音频与封面下载、ListenNotes 搜索和播放器倍速调节功能。原项目使用 MIT License，来源及修改说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 第三方来源与许可证

本仓库包含第三方脚本的派生版本、配置引用和本地适配代码。第三方来源、已确认许可证和未确认许可证的部分记录在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

- Bilibili 去广告覆写：基于 kokoryh 规则与 Kelee/Script Hub 转换结果进行本地调整，保留原作者及远程脚本来源说明。
- Cosmos Enhanced for wBlock：基于 LGiki 的 Cosmos Enhanced 浏览器扩展移植，适配用户脚本运行方式并保留上游归属；原项目采用 MIT License。

本仓库中由 zyxingdev 新增的说明文字和本地适配改动，在不覆盖第三方材料原有权利的前提下，按 Apache-2.0 许可提供。第三方材料继续遵循各自的上游许可证或授权状态。

## 免责声明

这些脚本和配置仅用于个人学习和自用场景。使用前请确认所在地区法律、目标服务条款、客户端规则以及上游项目许可证要求。
