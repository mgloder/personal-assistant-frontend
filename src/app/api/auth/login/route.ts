import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { post, API } from '@/utils/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Use our API utility to make the request
    const data = await post<{ access_token: string }>(API.auth.login, { email, password });

    // Create the response
    const res = NextResponse.json({ success: true });
    
    // Set the cookie with proper attributes
    res.cookies.set('access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return res;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'An error occurred during login' },
      { status: 500 }
    );
  }
} 