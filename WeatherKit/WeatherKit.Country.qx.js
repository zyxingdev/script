const url = new URL($request.url);
const paths = url.pathname.split("/").filter(Boolean);
const locale = paths[3] || "";
const latitude = Number(paths[4]);
const longitude = Number(paths[5]);
const localeRegion = locale.match(/-([A-Z]{2})(?:$|-)/)?.[1];
const isChinaCoordinate = latitude >= 18 && latitude <= 54 && longitude >= 73 && longitude <= 135;

if (!url.searchParams.has("country")) {
    url.searchParams.set("country", localeRegion || (isChinaCoordinate ? "CN" : ""));
}

$done({ url: url.toString() });
