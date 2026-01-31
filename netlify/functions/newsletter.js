// Forward newsletter subscriptions to AI Alchemist API
// This allows Books Master signups to be stored in the main Supabase database

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, name, interests } = JSON.parse(event.body);

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
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error || 'Failed to subscribe' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: data.message || 'Successfully subscribed!',
        metadata: { name, interests } // Keep for future use if needed
      })
    };
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process subscription' })
    };
  }
};
