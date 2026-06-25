# script

个人脚本与配置片段。

## 内容

- `Bilibili_remove_ads.stoverride`: 哔哩哔哩去广告相关 Loon/Stash Override 配置，引用 kokoryh 的远程处理脚本。
- `WeatherKit/`: 基于 NSRingo/WeatherKit 的 Quantumult X 本地适配，修复 country 参数丢失、空气质量图标和中文等级描述等问题，并统一使用中国 AQI（HJ 633—2012）标准。
- `jd-invoice-grouper.user.js`: 京东“我的发票”Tampermonkey 脚本，按销售方和发票号码归类凑单。

## WeatherKit

- [iRingo.WeatherKit.QX.snippet](WeatherKit/iRingo.WeatherKit.QX.snippet): Quantumult X 重写片段，包含空气质量数据源、国标算法和昨日对比逻辑。
- [WeatherKit.AirQualityScale.js](WeatherKit/WeatherKit.AirQualityScale.js): Quantumult X 使用的空气质量标尺响应脚本，提供颜色、图标和本地化等级描述。
- [WeatherKit.Country.qx.js](WeatherKit/WeatherKit.Country.qx.js): 为缺少 `country` 参数的 WeatherKit 请求补充地区信息。
- `request.bundle.js` / `response.bundle.js`: 基于上游 beta3 的请求与二进制响应处理脚本，由上述配置自动引用。

## 京东发票归类

- [jd-invoice-grouper.user.js](jd-invoice-grouper.user.js): 在 `https://myivc.jd.com/fpzz/index.action` 运行，读取带“换开申请”的发票订单，按订单日期筛选。
- 脚本从发票详情/XML 中读取销售方、含税金额、发票号码和商品链接；单笔已满 100 元的订单不参与凑单，只把同一销售方、单笔未满 100 元的发票凑到 100 元以上。
- 结果表返回“发票号码”，点击发票号码会跳转到对应商品详情页；也可导出 CSV。

## 安装

Quantumult X 可订阅 [iRingo.WeatherKit.QX.snippet](https://raw.githubusercontent.com/zyxingdev/script/main/WeatherKit/iRingo.WeatherKit.QX.snippet)。更新配置后请确认已启用 Rewrite、Script 和 MitM；若天气 App 仍使用旧标尺，请清理其缓存并重新打开。

京东发票脚本可通过 Tampermonkey 安装 [jd-invoice-grouper.user.js](https://raw.githubusercontent.com/zyxingdev/script/main/jd-invoice-grouper.user.js)。安装后打开京东“我的发票”页面，点击右侧“归类发票”按钮运行。

## 第三方来源与许可证

本仓库包含第三方脚本的派生版本、配置引用和本地适配代码。第三方来源、已确认许可证和未确认许可证的部分记录在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

- iRingo / NSRingo WeatherKit: 上游项目为 Apache-2.0 license，本仓库保留来源说明并记录本地修改。
- kokoryh Bilibili 脚本: 配置中保留原作者信息和远程脚本 URL；未在本次检查中确认到明确许可证，因此不将其声明为本仓库原创或重新授权内容。

本仓库中由 zyxingdev 新增的说明文字和本地适配改动，在不覆盖第三方材料原有权利的前提下，按 Apache-2.0 许可提供。第三方材料继续遵循其各自上游许可证或授权状态。

## 免责声明

这些脚本和配置仅用于个人学习和自用场景。使用前请确认所在地区法律、目标服务条款、客户端规则以及上游项目许可证要求。
