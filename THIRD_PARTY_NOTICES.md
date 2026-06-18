# Third-Party Notices

This repository contains personal scripts and local adaptations. It is not a single-origin codebase. Keep attribution and upstream notices when redistributing modified copies.

## NSRingo / iRingo WeatherKit

- Upstream: https://github.com/NSRingo/iRingo and https://github.com/NSRingo/WeatherKit
- Documentation: https://nsringo.github.io/guide/Weather/weather-kit.html
- License observed during review: Apache-2.0 for the NSRingo/iRingo repository.
- Local files:
  - `WeatherKit/iRingo.WeatherKit.QX.snippet`
  - `WeatherKit/request.bundle.js`
  - `WeatherKit/response.bundle.js`
  - `WeatherKit/WeatherKit.Country.qx.js`
  - `WeatherKit/WeatherKit.AirQualityScale.js`
- Local modifications:
  - Quantumult X raw URL adaptation.
  - WeatherKit country fallback for affected iOS 26.6 requests.
  - Air-quality scale handling and local CN/HK AQHI labels.

## kokoryh Bilibili Scripts

- Author: kokoryh, https://github.com/kokoryh
- Local file: `Bilibili_remove_ads.stoverride`
- Referenced remote scripts:
  - https://kelee.one/Resource/JavaScript/Bilibili/Bilibili_proto_response_kokoryh.js
  - https://kelee.one/Resource/JavaScript/Bilibili/Bilibili_json_kokoryh.js
- License status: no explicit license was confirmed during this review. The author attribution and source URLs are retained. Do not treat this material as newly licensed by this repository.

## Script-Hub echo-response.js

- Upstream: https://github.com/Script-Hub-Org/Script-Hub
- Referenced remote script:
  - https://raw.githubusercontent.com/Script-Hub-Org/Script-Hub/main/scripts/echo-response.js
- Local status: referenced by URL only; source code is not vendored in this repository.
