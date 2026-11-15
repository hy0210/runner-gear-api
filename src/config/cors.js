// 解析 CORS_ORIGINS（以逗號分隔的來源清單）。不接受萬用字元。
function parseCorsOrigins(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      let url;
      try {
        url = new URL(item);
      } catch {
        throw new Error('CORS_ORIGINS 的每一項都必須是完整的來源，例如 https://example.com');
      }
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('CORS_ORIGINS 只接受 http 或 https 來源');
      }
      return url.origin;
    });
}

function buildCorsOptions(origins) {
  return {
    // 只有清單內的來源會得到 Access-Control-Allow-Origin
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // 使用 Authorization 標頭帶 Token，不使用 cookie
    credentials: false,
    maxAge: 600,
  };
}

module.exports = { parseCorsOrigins, buildCorsOptions };
