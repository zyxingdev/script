# Third-Party Notices

This repository contains personal scripts and local adaptations. It is not a single-origin codebase. Keep attribution and upstream notices when redistributing modified copies.

## NSRingo / iRingo WeatherKit

- Upstream: https://github.com/NSRingo/iRingo and https://github.com/NSRingo/WeatherKit
- Documentation: https://nsringo.github.io/guide/Weather/weather-kit.html
- License observed during review: Apache-2.0 for the NSRingo/iRingo repository.
- Local files:
  - `QuantumultX/WeatherKit/iRingo.WeatherKit.QX.snippet`
  - `QuantumultX/WeatherKit/WeatherKit.Country.qx.js`
  - `Stash/WeatherKit/iRingo.WeatherKit.stoverride`
  - `Scripts/WeatherKit/request.bundle.js`
  - `Scripts/WeatherKit/response.bundle.js`
  - `Scripts/WeatherKit/WeatherKit.AirQualityScale.js`
- Local modifications:
  - Quantumult X raw URL adaptation.
  - WeatherKit country fallback for affected iOS 26.6 requests.
  - Air-quality scale handling and local CN/HK AQHI labels.

## Bilibili Remove Ads for Stash

- Original rule author: kokoryh (https://github.com/kokoryh)
- Conversion/resource entry: https://hub.kelee.one
- Script Hub dependency: https://github.com/Script-Hub-Org/Script-Hub
- Remote script providers referenced by the override:
  - https://raw.githubusercontent.com/Script-Hub-Org/Script-Hub/main/scripts/echo-response.js
  - https://kelee.one/Resource/JavaScript/Bilibili/Bilibili_proto_request_kokoryh.js
  - https://kelee.one/Resource/JavaScript/Bilibili/Bilibili_proto_response_kokoryh.js
  - https://kelee.one/Resource/JavaScript/Bilibili/Bilibili_json_kokoryh.js
- Local file:
  - `Stash/Bilibili/Bilibili_remove_ads.stoverride`
- Local modifications:
  - Replaced the generated upstream subscription marker with this repository's raw update URL.
  - Set the Stash override category to `去广告`.
  - Removed broad `biliapi.com` and `biliapi.net` reject rules.
  - Left `grpc.biliapi.net` outside the MitM hostname list to avoid slow History gRPC loading.
  - Kept `app.bilibili.com` MitM processing for JSON ad filtering and the gRPC fallback path.
  - Removed the hard-coded `account/mine` response rewrite.
- License status: no upstream license was independently confirmed for the converted override and the Kelee-hosted Bilibili scripts. Attribution and source URLs are retained; downstream users should verify redistribution terms before broader distribution.
