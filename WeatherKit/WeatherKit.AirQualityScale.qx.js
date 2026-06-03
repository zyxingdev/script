const scaleLabels = {
    HJ6332012: ["优", "良", "轻度污染", "中度污染", "重度污染", "严重污染"],
    EPA_NowCast: ["Good", "Moderate", "Unhealthy for Sensitive Groups", "Unhealthy", "Very Unhealthy", "Hazardous"],
    EU_EAQI: ["Good", "Fair", "Moderate", "Poor", "Very Poor", "Extremely Poor"],
    UBA: ["sehr gut", "gut", "mäßig", "schlecht", "sehr schlecht"],
};

const scaleRanges = {
    HJ6332012: [
        [0, 50],
        [51, 100],
        [101, 150],
        [151, 200],
        [201, 300],
        [301, 500],
    ],
    EPA_NowCast: [
        [0, 50],
        [51, 100],
        [101, 150],
        [151, 200],
        [201, 300],
        [301, null],
    ],
    EU_EAQI: [
        [0, 9],
        [10, 19],
        [20, 29],
        [30, 39],
        [40, 49],
        [50, null],
    ],
    UBA: [
        [0, 0.99],
        [1, 1.99],
        [2, 2.99],
        [3, 3.99],
        [4, null],
    ],
};

const colors = ["#00E400", "#FFFF00", "#FF7E00", "#FF0000", "#8F3F97", "#7E0023"];
const url = new URL($request.url);
console.log(`WeatherKit AirQualityScale mock: ${url.pathname}`);
const paths = url.pathname.split("/").filter(Boolean);
const locale = paths.at(-2) || "en-US";
const scaleID = paths.at(-1) || "HJ6332012.2414";
const lastDotIndex = scaleID.lastIndexOf(".");
const scaleName = lastDotIndex === -1 ? scaleID : scaleID.slice(0, lastDotIndex);
const version = lastDotIndex === -1 ? "2414" : scaleID.slice(lastDotIndex + 1);
const ranges = scaleRanges[scaleName] || scaleRanges.HJ6332012;
const labels = scaleLabels[scaleName] || scaleLabels.HJ6332012;
const categories = ranges.map(([min, max], index) => {
    const label = labels[index] || `Category ${index + 1}`;
    const range = { min, max };
    return {
        categoryIndex: index + 1,
        indexRange: range,
        range,
        label,
        localizedName: label,
        localizedDescription: label,
        color: colors[index] || colors.at(-1),
    };
});

const body = {
    name: scaleName,
    version,
    scale: `${scaleName}.${version}`,
    locale,
    localizedName: scaleName === "HJ6332012" ? "AQI (CN)" : scaleName,
    displayName: scaleName === "HJ6332012" ? "AQI (CN)" : scaleName,
    description: scaleName === "HJ6332012" ? "China AQI" : scaleName,
    categories,
    categoryRanges: categories,
    airQualityCategories: categories,
};

$done({
    status: "HTTP/1.1 200 OK",
    headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=86400",
    },
    body: JSON.stringify(body),
});
