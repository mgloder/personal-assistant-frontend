import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Get the cookie store
    const cookieStore = cookies();
    
    // Delete the access token cookie
    cookieStore.delete('access_token');
    
    // Return a success response
    return NextResponse.json(
      { message: 'Logged out successfully' },
      { 
        status: 200,
        headers: {
          // Set cache control headers to prevent caching
          'Cache-Control': 'no-store, max-age=0',
          'Pragma': 'no-cache',
        }
      }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Error during logout' },
      { status: 500 }
    );
  }
} 