// Quantumult X: remove splash advertisements from JD's `functionId=start` response.

const body = $response.body || "";

try {
    const payload = JSON.parse(body);

    if (Array.isArray(payload.images)) {
        for (const group of payload.images) {
            if (!Array.isArray(group)) continue;

            for (const item of group) {
                if (!item || typeof item !== "object") continue;

                item.showTimes = 0;
                item.time = 0;
                item.onlineTime = "2099-12-31 00:00:00";
                item.referralsTime = "2099-12-31 00:00:00";
            }
        }
    }

    payload.countdown = 0;
    payload.showTimesDaily = 0;

    $done({ body: JSON.stringify(payload) });
} catch (error) {
    console.log(`[JD Splash] 保留无法解析的原响应：${error.message}`);
    $done({ body });
}
