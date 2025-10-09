// Import module alias setup first
import './moduleAlias';

import dotenv from 'dotenv';
import { emailService } from '@services/emailService';

dotenv.config();


async function testEmail() {
  console.log('🧪 Testing ZeptoMail integration...');
  
  try {
    // Test sending an OTP email
    const result = await emailService.sendOtpEmail(
      'test@example.com', // Replace with your test email
      '123456',
      'Test User'
    );
    
    if (result) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('❌ Email sending failed');
    }
  } catch (error) {
    console.error('❌ Error testing email:', error);
  }
}

testEmail();
