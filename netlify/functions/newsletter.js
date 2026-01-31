const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const { data, error } = await resend.emails.send({
      from: 'Booksmaster <manny@aialchemist.net>',
      to: ['manny@aialchemist.net'],
      subject: 'New Newsletter Subscription',
      html: `
        <h2>New Newsletter Subscription</h2>
        <p><strong>Email:</strong> ${email}</p>
        ${name ? `<p><strong>Name:</strong> ${name}</p>` : ''}
        ${interests ? `<p><strong>Interested In:</strong> ${interests}</p>` : ''}
        <p><em>Subscribed from: Booksmaster support page</em></p>
      `,
    });

    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' })
    };
  }
};
