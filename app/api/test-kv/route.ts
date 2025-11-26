import { NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';

export async function GET() {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    console.log('KV_REST_API_URL exists:', !!url);
    console.log('KV_REST_API_TOKEN exists:', !!token);

    if (!url || !token) {
      return NextResponse.json({
        error: 'KV environment variables not set',
        url: !!url,
        token: !!token
      }, { status: 500 });
    }

    const kv = createClient({ url, token });

    // Test write
    const testKey = `test_${Date.now()}`;
    await kv.set(testKey, 'Hello KV!', { ex: 60 });

    // Test read
    const value = await kv.get(testKey);

    // Test delete
    await kv.del(testKey);

    return NextResponse.json({
      success: true,
      message: 'KV connection successful',
      testValue: value,
      kvConfigured: true
    });
  } catch (error: any) {
    console.error('KV test error:', error);
    return NextResponse.json({
      error: 'KV connection failed',
      message: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}
