import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

// Ensure NextResponse is available globally so Next.js route handlers don't crash
// if they import it and use it.
if (typeof (globalThis as any).NextResponse === 'undefined') {
  (globalThis as any).NextResponse = class extends Response {
    static json(body: any, init?: ResponseInit) {
      return Response.json(body, init);
    }
  };
}

export async function adaptNextRoute(req: ExpressRequest, res: ExpressResponse, nextRoute: any, params: any = {}) {
  const protocol = req.protocol || 'http';
  const host = req.headers.host || 'localhost';
  const url = new URL(req.originalUrl || req.url, `${protocol}://${host}`);

  const init: RequestInit = {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // Re-serialize the JSON body to pass it to the Web Request
    init.body = req.body ? JSON.stringify(req.body) : undefined;
  }

  const webReq = new Request(url.href, init);

  try {
    const method = req.method.toUpperCase();
    if (typeof nextRoute[method] !== 'function') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Call the Next.js API handler
    const webRes: Response = await nextRoute[method](webReq, { params });

    // Stream headers back to Express
    const headers: Record<string, string> = {};
    webRes.headers.forEach((value, key) => {
      headers[key] = value;
    });
    res.set(headers);
    res.status(webRes.status);

    if (webRes.body) {
      // Read text/json response
      const text = await webRes.text();
      res.send(text);
    } else {
      res.end();
    }
  } catch (error: any) {
    console.error(`API Error on ${req.method} ${req.url}:`, error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
