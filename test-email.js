// Quick SendGrid verification test
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'SG.lbYNnQvuR7OvKAoYepShXg.igYj1ZsPTdmBKX9-LpqiC37wHJ3xQkNt20XStMVKkA8n');

const msg = {
  to: 'test@example.com', // Change this to your email
  from: 'applications@innovativeautomations.dev',
  replyTo: 'info@innovativeglobaltalent.com',
  subject: 'SendGrid Test - Visa Petition Generator',
  text: 'This is a test email from your visa petition generator application.',
  html: '<strong>This is a test email from your visa petition generator application.</strong>',
};

sgMail
  .send(msg)
  .then(() => {
    console.log('✅ Email sent successfully!');
    console.log('✅ Sender verification: PASSED');
    console.log('✅ Ready for deployment');
  })
  .catch((error) => {
    console.error('❌ Error sending email:');
    console.error(error.response?.body || error.message);

    if (error.message.includes('does not match a verified Sender Identity')) {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('   Go to https://app.sendgrid.com/settings/sender_auth/senders');
      console.log('   And verify: applications@innovativeautomations.dev');
    }
  });
