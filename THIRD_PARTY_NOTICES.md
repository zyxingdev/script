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
