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
    const { email, subject, message } = JSON.parse(event.body);

    const { data, error } = await resend.emails.send({
      from: 'Booksmaster <manny@aialchemist.net>',
      to: ['manny@aialchemist.net'],
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><em>Sent from: Booksmaster support page</em></p>
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
