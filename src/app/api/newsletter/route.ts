import { NextResponse } from 'next/server';

// Forward newsletter subscriptions to AI Alchemist API
// This allows Books Master signups to be stored in the main Supabase database

export async function POST(request: Request) {
  try {
    const { email, name, interests } = await request.json();

    // Forward to AI Alchemist newsletter API
    const response = await fetch('https://ai-alchemist.netlify.app/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        source: 'booksmaster' // Track that this came from Books Master
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to subscribe' },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: data.message || 'Successfully subscribed!',
      metadata: { name, interests } // Keep for future use if needed
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}
