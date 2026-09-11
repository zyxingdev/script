// 京东 start 诊断版，2026-09-11。仅用于配套 QX 规则。
// 保留原规则的 images=[] / showTimesDaily=0 行为。
// 只记录处理状态，不输出 URL、Cookie 或响应内容。排查结束后停用。
(function () {
  var result = {};
  var state = "UNEXPECTED_REQUEST";
  var detail = "请求不在诊断范围，原样放行";
  try {
    if (/^https?:\/\/api\.m\.jd\.com\/(?=[^#]*[?&]functionId=start(?:&|$))[^#]*$/.test($request.url)) {
      var obj;
      try {
        obj = JSON.parse($response.body);
      } catch (_) {
        state = "INVALID_JSON";
        detail = "响应不是有效 JSON，原样放行";
      }
      if (state !== "INVALID_JSON") {
        if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
          state = "NON_OBJECT";
          detail = "响应不是 JSON 对象，原样放行";
        } else {
          var known = Array.isArray(obj.images);
          var count = known ? obj.images.length : null;
          var alreadyEmpty = known && count === 0 && obj.showTimesDaily === 0;
          obj.images = [];
          obj.showTimesDaily = 0;
          result = { body: JSON.stringify(obj) };
          state = !known ? "UNKNOWN_SCHEMA" : alreadyEmpty ? "ALREADY_EMPTY" : "MODIFIED";
          detail = !known ? "缺少预期 images 数组；沿用旧规则写入空数组，不能据此确认去广告有效"
            : alreadyEmpty ? "images 原本为空且次数为 0；仅证明脚本执行"
            : "已清空 images（原顶层元素数=" + count + "），次数设为 0；不代表已清除本地缓存";
        }
      }
    }
  } catch (_) {
    result = {};
    state = "SCRIPT_ERROR";
    detail = "处理异常，原样放行";
  }
  // 诊断输出失败不能阻止请求完成。
  try {
    console.log("[JD-DEBUG 2026-09-11] " + new Date().toISOString() + " " + state + " " + detail);
    $notify("京东开屏诊断", state, detail);
  } catch (_) {}
  $done(result);
})();
