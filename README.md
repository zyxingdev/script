# script

个人使用的代理客户端配置、覆写和共享脚本，按客户端与资源类型分类存放。

## 目录结构

```text
.
├── QuantumultX/
│   ├── JD/                 # 京东去广告重写
│   └── WeatherKit/         # WeatherKit QX 配置及专用脚本
├── Stash/
│   ├── Bilibili/           # Bilibili 去广告覆写及说明
│   ├── Google/             # Google 搜索与地图重定向
│   └── WeatherKit/         # WeatherKit Stash 覆写
├── Scripts/
│   └── WeatherKit/         # 多客户端共用的 WeatherKit 脚本
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

### WeatherKit

- 配置：[iRingo.WeatherKit.QX.snippet](QuantumultX/WeatherKit/iRingo.WeatherKit.QX.snippet)
- QX 专用脚本：[WeatherKit.Country.qx.js](QuantumultX/WeatherKit/WeatherKit.Country.qx.js)
- 订阅地址：

```text
https://raw.githubusercontent.com/zyxingdev/script/main/QuantumultX/WeatherKit/iRingo.WeatherKit.QX.snippet
```

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

### WeatherKit

- 覆写：[iRingo.WeatherKit.stoverride](Stash/WeatherKit/iRingo.WeatherKit.stoverride)
- 订阅地址：

```text
https://raw.githubusercontent.com/zyxingdev/script/main/Stash/WeatherKit/iRingo.WeatherKit.stoverride
```

## 共享脚本

[Scripts/WeatherKit/](Scripts/WeatherKit/) 存放 Quantumult X 与 Stash 共用的 WeatherKit 请求、响应和空气质量标尺脚本。客户端配置通过 Raw 地址引用这些文件，不需要单独订阅。

WeatherKit 本地适配用于修复 country 参数丢失、空气质量图标和中文等级描述等问题，并统一使用中国 AQI（HJ 633—2012）标准。更新配置后请确认相应客户端已启用 Rewrite、Script 和 MitM；若天气 App 仍使用旧标尺，请清理缓存并重新打开。

## 第三方来源与许可证

本仓库包含第三方脚本的派生版本、配置引用和本地适配代码。第三方来源、已确认许可证和未确认许可证的部分记录在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

- iRingo / NSRingo WeatherKit：上游项目采用 Apache-2.0，本仓库保留来源说明并记录本地修改。
- Bilibili 去广告覆写：基于 kokoryh 规则与 Kelee/Script Hub 转换结果进行本地调整，保留原作者及远程脚本来源说明。

本仓库中由 zyxingdev 新增的说明文字和本地适配改动，在不覆盖第三方材料原有权利的前提下，按 Apache-2.0 许可提供。第三方材料继续遵循各自的上游许可证或授权状态。

## 免责声明

这些脚本和配置仅用于个人学习和自用场景。使用前请确认所在地区法律、目标服务条款、客户端规则以及上游项目许可证要求。
