const url = new URL($request.url);
console.log(`WeatherKit AirQualityScale mock: ${url.pathname}`);

const paths = url.pathname.split("/").filter(Boolean);
const locale = paths[paths.length - 2] || "en-US";
const scaleID = paths[paths.length - 1] || "HJ6332012.2414";
const language = /^zh-Hant/i.test(locale) ? "zh-TW" : /^zh/i.test(locale) ? "zh-CN" : "en-US";
const isZh = /^zh/i.test(language);

const labels = isZh
    ? ["优", "良", "轻度污染", "中度污染", "重度污染", "严重污染"]
    : ["Good", "Moderate", "Unhealthy for Sensitive Groups", "Unhealthy", "Very Unhealthy", "Hazardous"];
const recommendations = isZh
    ? [
        "空气质量令人满意，基本无空气污染。",
        "极少数异常敏感人群应减少户外活动。",
        "敏感人群应减少较长时间、高强度户外活动。",
        "敏感人群应避免较长时间、高强度户外活动，一般人群适量减少户外活动。",
        "儿童、老人及心脏病、呼吸系统疾病患者应停留在室内，一般人群减少户外活动。",
        "儿童、老人和病人应停留在室内，一般人群应避免户外活动。",
    ]
    : [
        "Air quality is satisfactory.",
        "Unusually sensitive people should consider reducing prolonged outdoor exertion.",
        "Sensitive groups should reduce prolonged or heavy outdoor exertion.",
        "Sensitive groups should avoid prolonged or heavy outdoor exertion.",
        "Sensitive groups should stay indoors and everyone should reduce outdoor exertion.",
        "Everyone should avoid outdoor exertion.",
    ];
const ranges = [
    [0, 50],
    [51, 100],
    [101, 150],
    [151, 200],
    [201, 300],
    [301, 500],
];
const colors = ["#00E400", "#FFFF00", "#FF7E00", "#FF0000", "#8F3F97", "#7E0023"];
const glyphs = ["aqi.low", "aqi.medium", "aqi.high", "aqi.high", "aqi.high", "aqi.high"];

const categories = ranges.map(([start, end], index) => ({
    categoryNumber: index + 1,
    range: [start, end],
    color: colors[index],
    glyph: glyphs[index],
    categoryName: labels[index],
    recommendation: recommendations[index],
}));

const body = {
    name: scaleID,
    displayName: "AQI (CN)",
    shortDisplayName: "AQI",
    longDisplayName: isZh ? "中国 (AQI)" : "China (AQI)",
    displayLabel: isZh ? "空气质量" : "Air Quality",
    language,
    version: 1,
    aqi: {
        numerical: true,
        ascending: true,
        range: [0, 500],
        categories,
        gradient: {
            stops: [
                { location: 0, color: colors[0] },
                { location: 50, color: colors[0] },
                { location: 100, color: colors[1] },
                { location: 150, color: colors[2] },
                { location: 200, color: colors[3] },
                { location: 300, color: colors[4] },
                { location: 500, color: colors[5] },
            ],
        },
    },
};

$done({
    status: "HTTP/1.1 200 OK",
    headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=86400",
    },
    body: JSON.stringify(body),
});
