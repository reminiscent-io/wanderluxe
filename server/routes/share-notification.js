import express from 'express';
import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY is not set - email notifications will not be sent');
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  try {
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
  } catch (error) {
    console.error('Error setting SendGrid API key:', error);
  }
}

const router = express.Router();

// Share notification endpoint
router.post('/api/send-share-notification', async (req, res) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: 'SendGrid API key is not configured' 
      });
    }

    const { toEmail, fromEmail, tripDestination } = req.body;

    if (!toEmail || !fromEmail || !tripDestination) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const emailSubject = `${fromEmail} shared a trip to ${tripDestination} with you`;
    
    // Create email content
    const emailContent = {
      to: toEmail,
      from: {
        email: 'no-reply@wanderluxe.app',
        name: 'WanderLuxe',
      },
      subject: emailSubject,
      text: `
        Hello!
        
        ${fromEmail} has shared a trip to ${tripDestination} with you on WanderLuxe.
        
        To view this trip, log in to your WanderLuxe account. If you don't have an account yet, 
        you can sign up with this email address (${toEmail}) and the trip will be available 
        in your "Shared With Me" section.
        
        Happy travels!
        The WanderLuxe Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f5f0; padding: 20px; text-align: center;">
            <h1 style="color: #7c5e45; margin: 0;">WanderLuxe</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p>Hello!</p>
            <p><strong>${fromEmail}</strong> has shared a trip to <strong>${tripDestination}</strong> with you on WanderLuxe.</p>
            <p>To view this trip, log in to your WanderLuxe account. If you don't have an account yet, 
            you can sign up with this email address (${toEmail}) and the trip will be available 
            in your "Shared With Me" section.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.VITE_PUBLIC_URL || 'https://wanderluxe.app'}" 
                style="background-color: #7c5e45; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                View Shared Trip
              </a>
            </div>
            <p>Happy travels!<br/>The WanderLuxe Team</p>
          </div>
          <div style="background-color: #f8f5f0; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>&copy; ${new Date().getFullYear()} WanderLuxe. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      // Send the email
      await mailService.send(emailContent);

      res.status(200).json({ 
        success: true, 
        message: 'Notification email sent successfully' 
      });
    } catch (emailError) {
      console.error('SendGrid error:', emailError);
      // Return a 200 status but with failure info so frontend knows trip was shared
      // but notification failed
      res.status(200).json({
        success: false,
        partial: true, // indicates trip is shared but email failed
        message: 'Trip was shared but notification email failed to send'
      });
    }
  } catch (error) {
    console.error('Error sending share notification email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send notification email',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;