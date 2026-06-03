const headers = {
    ...$response.headers,
    "Content-Type": "application/json",
    "Cache-Control": "max-age=86400",
};

$done({
    status: "HTTP/1.1 200 OK",
    headers,
});
