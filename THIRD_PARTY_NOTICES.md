# Third-Party Notices

This repository contains personal scripts and local adaptations. It is not a single-origin codebase. Keep attribution and upstream notices when redistributing modified copies.

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
  - Removed Loon conversion-only metadata (`system`, `system_version`, `loon_version`, and generated `date`).
  - Removed broad `biliapi.com` and `biliapi.net` reject rules.
  - Left `grpc.biliapi.net` outside the MitM hostname list to avoid slow History gRPC loading.
  - Kept `app.bilibili.com` MitM processing for JSON ad filtering and the gRPC fallback path.
  - Removed the hard-coded `account/mine` response rewrite.
- License status: no upstream license was independently confirmed for the converted override and the Kelee-hosted Bilibili scripts. Attribution and source URLs are retained; downstream users should verify redistribution terms before broader distribution.

## Google Redirect for Stash

- Original rule/resource entry: https://hub.kelee.one
- Author attribution retained from the converted override: 可莉🅥 (https://github.com/luestr/ProxyResource/blob/main/README.md)
- Local file:
  - `Stash/Google/Google.stoverride`
- Local modifications:
  - Replaced the Script Hub conversion URL with this repository's raw update URL.
  - Removed conversion-only metadata fields (`tag`, `loon_version`, and `date`).
  - Kept the original MitM hostname and redirect behavior unchanged.
- License status: no upstream license was independently confirmed. Attribution and source URLs are retained; downstream users should verify redistribution terms before broader distribution.

## Cosmos Enhanced for wBlock

- Upstream project and author: [LGiki/cosmos-enhanced](https://github.com/LGiki/cosmos-enhanced), by LGiki.
- Upstream license: MIT License ([LICENSE](https://github.com/LGiki/cosmos-enhanced/blob/main/LICENSE)).
- Local file: `Scripts/cosmos-enhanced-wblock.user.js`.
- Adaptation: migrated the browser extension's page features to a standalone userscript for wBlock; replaced extension-only download and tab APIs with page link downloads and `window.open`; included userscript metadata, update URL, and page styles in the script.
- Local maintainer/update URL: https://github.com/zyxingdev/script and https://raw.githubusercontent.com/zyxingdev/script/main/Scripts/cosmos-enhanced-wblock.user.js.
- The upstream project remains credited in the script metadata and documentation. The upstream MIT license applies to the upstream-derived work; see the upstream license for its terms.
