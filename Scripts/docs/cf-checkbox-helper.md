# Cloudflare Checkbox Helper

[返回脚本目录](../README.md) · [返回仓库首页](../../README.md)

第一版：`1.0.0`。一个尽力而为的用户脚本：自动寻找脚本可访问的 Cloudflare 验证复选框，并尝试点击一次。

**本脚本不绕过 Cloudflare 验证，不保证验证成功。尚未在 macOS Safari 的实际目标网站验证效果。**

## 安装（macOS Safari）

1. 安装并启用 Safari 版 Tampermonkey。
2. [打开脚本安装地址](https://raw.githubusercontent.com/zyxingdev/script/main/Scripts/cf-checkbox-helper.user.js)。如果未显示安装提示，在 Tampermonkey 中新建脚本，粘贴文件全部内容并保存。
3. 在 Safari 的「设置 → 扩展」中检查 Tampermonkey 的网站访问权限，允许它访问需要使用的网站及 `challenges.cloudflare.com`。
4. 重新加载目标页面。仍需手动验证时，请直接手动操作。

## 工作方式

- 只匹配 `https://challenges.cloudflare.com/*`，包括扩展能够注入的匹配 iframe。
- 每 750 毫秒检查一次，30 秒后停止；每个脚本实例最多尝试点击一次。
- 查找未勾选、未禁用且可见的复选框；也支持原生输入框被隐藏、关联标签可见的情况。
- 可遍历开放的 Shadow DOM，无法访问封闭的 Shadow DOM。
- 无外部依赖，不读取 Cookie，不发送额外网络请求，不自动刷新页面。

## 限制与排查

- 扩展未获授权、无法注入验证 iframe，或控件处于封闭 Shadow DOM 时，脚本无法点击。
- 脚本调用 `click()` 不等同于真实用户操作，验证服务可能不接受。
- 控制台出现 `Attempted one click` 仅表示发出了点击调用，不表示验证通过。
- 出现 `No accessible checkbox found within 30 seconds` 表示当前实例未找到可操作的复选框。
- 整页验证、自动验证或其他域名上的验证不保证适用。不要把 `@match` 改成全站匹配，以免点击无关复选框。
- 本地已运行 `node --check` 语法检查；未进行 Safari 扩展注入或真实 Cloudflare 验证测试。

## 版本记录

### 1.0.0

- 首次发布，包含可见标签兼容、禁用状态检查和超时日志。

## 参考

- [Tampermonkey 文档](https://www.tampermonkey.net/documentation.php)
- [Cloudflare 支持的浏览器与扩展兼容问题](https://developers.cloudflare.com/cloudflare-challenges/reference/supported-browsers/)
- [Safari 扩展管理](https://support.apple.com/guide/safari/use-safari-extensions-sfri32508/mac)
