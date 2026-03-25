import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function handler(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const search = req.nextUrl.search;
  const url = `${API_URL}/api/${path}${search}`;

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  const authorization = req.headers.get('authorization');
  if (contentType) headers.set('content-type', contentType);
  if (authorization) headers.set('authorization', authorization);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  const response = await fetch(url, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    // @ts-ignore
    duplex: hasBody ? 'half' : undefined,
  });

  const resHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
      resHeaders.set(key, value);
    }
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: resHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
