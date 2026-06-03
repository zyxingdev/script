# script

个人脚本与配置片段。

## 致谢

- WeatherKit QX 修复: 基于 [NSRingo/WeatherKit](https://github.com/NSRingo/WeatherKit) 的 iRingo WeatherKit 脚本进行 Quantumult X 本地适配，并参考了 [issue #65](https://github.com/NSRingo/WeatherKit/issues/65) 中提到的 iOS 26.6 WeatherKit country 丢失问题。感谢 NSRingo 和 iRingo 贡献者提供原始 WeatherKit 脚本。
- 当前修复保留上游默认的 EU EAQI 空气质量等级计算，并将结果映射到 iOS 天气 App 可显示的标尺，以恢复空气质量数值和程度描述。

- Bilibili 去广告配置: `Bilibili_remove_ads.stoverride` 引用了 [kokoryh](https://github.com/kokoryh) 开源脚本相关代码，用于处理 Bilibili 的广告、推荐位和 JSON/protobuf 响应改写逻辑。

- X 书签已读脚本: `bookmark-is-learned.user.js` 引用了 [iamzifei/bookmark-is-learned](https://github.com/iamzifei/bookmark-is-learned) 项目代码，用于在 X/Twitter 书签流程中辅助标记、整理和分析已学习内容。
