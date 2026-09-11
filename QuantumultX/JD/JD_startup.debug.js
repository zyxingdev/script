// 京东 startup 请求诊断版，2026-09-11。仅用于配套 QX 规则。
// 当前京东版本把 functionId=startup 放在 POST 请求体；只发送通知，不记录请求体内容。
(function () {
  var body = ($request && $request.body) || "";
  var hit = /(?:^|&)functionId=startup(?:&|$)/.test(body);
  if (hit) {
    try {
      console.log("[JD-DEBUG 2026-09-11] STARTUP_REQUEST");
      $notify("京东开屏诊断", "STARTUP_REQUEST", "已命中 POST 请求体 functionId=startup；响应不是开屏图片素材");
    } catch (_) {}
  }
  $done({});
})();
