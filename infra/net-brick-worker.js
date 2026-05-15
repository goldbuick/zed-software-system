export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = decodeURIComponent(url.searchParams.get("brick"));

    if (!targetUrl) {
      return new Response("brick not found", { status: 400 });
    }

    // Handle CORS preflight
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Proxy the request to the target API
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });

      // Clone and modify response headers
      const newHeaders = new Headers(response.headers);
      Object.keys(corsHeaders).forEach(key => newHeaders.set(key, corsHeaders[key]));

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    } catch (e) {
      return new Response("brick is sad", { status: 500 });
    }
  }
};
