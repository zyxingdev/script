# 京东开屏诊断

没有广告不等于重写有效；出现广告也不能单凭画面判断是缓存还是遗漏接口。
现有正式规则只覆盖 URL 查询参数中的 `start`、`home_launchConfig` 和一个固定尺寸素材路径。

## 临时诊断（无需发布到 GitHub）

1. 将 `JD_start.debug.js` 保存到 iPhone「文件」中的 `Quantumult X/Scripts` 目录。
2. 停用原京东重写资源及其他匹配相同接口的重写，导入同目录 `JD_debug.QX.snippet` 为重写资源，关闭资源解析器。该资源引用手机本地 JS 文件，不能只导入 snippet 而不保存 JS。
3. 确认 QX 隧道、重写和 MitM 已启用，CA 证书已安装且完全信任，并允许 QX 通知。检查资源已载入，且没有脚本文件找不到的错误。
4. 在京东内清理缓存，再强制结束京东并重新打开。记录广告出现的时间，查看 QX 日志中的 `[JD-DEBUG 2026-09-11]` 和相同时间的请求记录。清理缓存未必删除所有开屏素材，不必卸载 App。
5. 排查结束后停用诊断资源，恢复正式资源，避免持续通知。

| 状态 | 能证明什么 |
| --- | --- |
| MODIFIED | start 响应的已知字段已修改，不证明 App 最终没有展示其他广告 |
| ALREADY_EMPTY | 脚本执行了，但相关字段本来就是空/零，不能把无广告归功于本次处理 |
| UNKNOWN_SCHEMA | 返回结构与预期不符；仍沿用旧规则写字段，需要脱敏样本判断接口是否变化 |
| INVALID_JSON / NON_OBJECT / SCRIPT_ERROR | 未修改响应，需进一步检查返回内容或运行错误 |
| 没有诊断日志 | 无法单独判断：可能未发 start 请求、未命中、MitM 未生效、规则冲突或脚本未载入 |

诊断通知只覆盖 `start`。`home_launchConfig` 和素材路径仍由原生 reject 处理，应在 QX 请求记录中核对是否命中相应重写；直连或代理策略记录不能证明重写执行。QX 官方说明响应体为空时不执行 body 重写，这也是没有日志的一种可能。

如果仍有广告，请提供对应时间的诊断状态和京东请求的域名、路径、functionId，以及京东/QX 版本。不要发送 Cookie、Authorization、账户标识或完整带参数 URL。若需响应样本，先去除个人字段。

## 范围与限制

- 诊断版仅增加 start 响应处理日志与通知，保留原有两个拦截规则；没有扩大拦截范围。
- functionId 在 POST 请求体、接口改名、其他素材路径均不在现有 URL 匹配范围。尚无手机抓包证据证明你遇到了其中哪一种。
- 固定尺寸图片路径可能承载正常图片，原规则已有此副作用；出现正常图片缺失时停用该条。
- 本地测试使用模拟 QX 环境，不能替代手机上的 MitM、规则匹配和真实京东验证。

依据：[QX 官方配置](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)、[官方脚本示例](https://github.com/crossutility/Quantumult-X/blob/master/sample-rewrite-with-script.js)。
