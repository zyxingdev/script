# 京东开屏广告处理与诊断

没有广告不等于重写一定生效；京东也可能根据缓存、设备和服务端策略决定是否展示开屏。

## 根据 2026-09-11 抓包补充的规则

这次抓包显示，当前京东版本的启动请求是：

- `POST https://api.m.jd.com/client.action?`
- `functionId=startup` 在 POST 请求体，不在 URL 查询参数
- 响应为 `data.deviceLevel`，没有开屏图片数组
- 开屏图片请求走 `quic.360buyimg.com/mobilecms/s1125x2436_jfs/...`

因此正式资源增加了该素材路径的精确拦截；没有改动普通京东图片路径。该尺寸路径理论上可能承载正常图片，若发现正常图片缺失，停用对应 `quic` 规则。

## 在 iOS 版 QX 中使用

1. 先停用旧的京东重写资源，避免相同请求被旧规则抢先处理。
2. 导入 `JD_remove_ads.QX.snippet` 作为正式重写资源，或导入 `JD_debug.QX.snippet` 做诊断；资源解析器关闭（`opt-parser=false`）。
3. 将诊断用的 `JD_start.debug.js` 和 `JD_startup.debug.js` 放到 QX 的 `Scripts` 目录。开启 iCloud 云盘时，路径是 QX 的 iCloud 资源目录；也可以在“文件”App 中进入 Quantumult X 对应文件夹确认。
4. 确认隧道、重写和 MitM 已开启，并安装且完全信任 QX CA 证书。`api.m.jd.com` 与 `quic.360buyimg.com` 都需要能看到绿色锁。
5. 在 QX“其他设置”页面向下找到“通知”相关开关并开启。你的 build941 没有独立的“脚本记录/脚本日志”入口，不需要继续寻找；诊断结果通过 QX 通知确认，网络活动页面只用来确认请求是否出现。
6. 清理京东缓存，彻底结束京东后重新打开。若命中当前接口，会收到 `STARTUP_REQUEST` 通知；这只能证明请求经过 QX，不能单独证明京东最终没有展示其他广告。
7. 诊断完成后停用 `JD_debug.QX.snippet`，恢复正式资源，避免每次启动都弹通知。

`console.log` 属于调试输出；你截图中的 QX 日志等级是 `error`，所以看不到普通脚本日志是正常的。通知比日志入口更适合这版 QX。

## 诊断资源说明

`JD_start.debug.js` 兼容旧版把 `functionId=start` 放在 URL 查询参数的响应重写。

`JD_startup.debug.js` 匹配当前版本的 POST 请求体，只检查 `functionId=startup` 是否存在，不输出 Cookie、Authorization、请求体或完整 URL。

## 安全与限制

- 不要发送 Cookie、Authorization、账户标识或完整带参数 URL；如需响应样本，先去除个人字段。
- QX body 重写只对非空响应体执行；当前抓取的 `startup` 响应有内容，但它本身没有开屏图片字段。
- 正式规则仍保留旧的 `start`、`home_launchConfig` 兼容处理；如果京东再次更换接口或素材路径，需要重新抓包适配。

依据：[QX 官方配置](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)、[官方脚本示例](https://github.com/crossutility/Quantumult-X/blob/master/sample-rewrite-with-script.js)。
