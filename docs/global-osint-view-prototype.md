# SG Global OSINT View — isolated prototype
- Branch: `feat/global-osint-view-prototype`; file: `preview/global-osint-view.html`.
- Uses CesiumJS 1.120 from public CDN with an ellipsoid and OpenStreetMap raster imagery. No Cesium Ion token, secret, or paid hosting.
- Reference points: Singapore and Pedra Branca. They are static geographic markers, not live intelligence.
- No aircraft, vessel, satellite or personal-device feeds are collected. No existing scheduler, Pages route, PWA manifest or production file is modified.
- External CDN and map-tile availability, third-party terms, attribution and Android GPU compatibility must be verified before any release.
- Test Android globe render, zoom, rotate, Singapore/Pedra Branca controls, marker taps, global reset, and fallback on failed CDN load.
- Avoid copying third-party project's code; independently implemented proof of concept.
