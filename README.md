# script

个人脚本与配置片段。

## 内容

- `WeatherKit/`: 基于 NSRingo/WeatherKit 的 Quantumult X 与 Stash 本地适配，修复 country 参数丢失、空气质量图标和中文等级描述等问题，并统一使用中国 AQI（HJ 633—2012）标准。
- `JD/`: Quantumult X 京东去广告重写，屏蔽启动页广告、DNS 配置与直播入口。

## 京东去广告

Quantumult X 可订阅 [JD_remove_ads.QX.snippet](https://raw.githubusercontent.com/zyxingdev/script/main/JD/JD_remove_ads.QX.snippet)。启用 Rewrite 与 MitM 后重新打开京东 App；店铺页直播规则会同时移除活动弹窗、关注按钮和直播观看入口。

## WeatherKit

- [iRingo.WeatherKit.QX.snippet](WeatherKit/iRingo.WeatherKit.QX.snippet): Quantumult X 重写片段，包含空气质量数据源、国标算法和昨日对比逻辑。
- [iRingo.WeatherKit.stoverride](WeatherKit/iRingo.WeatherKit.stoverride): Stash 覆写配置，引用同一套 WeatherKit 脚本并启用中国 AQI 标尺。
- [WeatherKit.AirQualityScale.js](WeatherKit/WeatherKit.AirQualityScale.js): Quantumult X 与 Stash 共用的空气质量标尺响应脚本，提供颜色、图标和本地化等级描述。
- [WeatherKit.Country.qx.js](WeatherKit/WeatherKit.Country.qx.js): 为缺少 `country` 参数的 WeatherKit 请求补充地区信息。
- `request.bundle.js` / `response.bundle.js`: 基于上游 beta3 的请求与二进制响应处理脚本，由上述配置自动引用。

## 安装

Quantumult X 可订阅 [iRingo.WeatherKit.QX.snippet](https://raw.githubusercontent.com/zyxingdev/script/main/WeatherKit/iRingo.WeatherKit.QX.snippet)。Stash 可订阅 [iRingo.WeatherKit.stoverride](https://raw.githubusercontent.com/zyxingdev/script/main/WeatherKit/iRingo.WeatherKit.stoverride)。更新配置后请确认已启用 Rewrite、Script 和 MitM；若天气 App 仍使用旧标尺，请清理其缓存并重新打开。

## 第三方来源与许可证

本仓库包含第三方脚本的派生版本、配置引用和本地适配代码。第三方来源、已确认许可证和未确认许可证的部分记录在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

- iRingo / NSRingo WeatherKit: 上游项目为 Apache-2.0 license，本仓库保留来源说明并记录本地修改。

本仓库中由 zyxingdev 新增的说明文字和本地适配改动，在不覆盖第三方材料原有权利的前提下，按 Apache-2.0 许可提供。第三方材料继续遵循其各自上游许可证或授权状态。

## 免责声明

这些脚本和配置仅用于个人学习和自用场景。使用前请确认所在地区法律、目标服务条款、客户端规则以及上游项目许可证要求。
