export interface EmailData {
  to: string;
  from?: string; // Will default if not provided
  subject: string;
  html: string;
}

export const templates = {
  newReview: (tenantName: string, reviewerName: string, rating: number): EmailData => ({
    to: "", // This will be set by the caller
    subject: `You've received a new ${rating}-star review!`,
    html: `
      <h1>New Customer Review</h1>
      <p>Hi ${tenantName},</p>
      <p>You have a new review from <strong>${reviewerName}</strong>.</p>
      <p>They gave you a rating of ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}.</p>
      <p>Log in to your dashboard to read the review and post a response.</p>
      <br/>
      <p>Regards,</p>
      <p>The Diner SaaS Team</p>
    `,
  }),

  reviewResponseConfirmation: (tenantName: string, reviewerName: string): EmailData => ({
    to: "",
    subject: "Your response has been posted",
    html: `
      <h1>Response Posted</h1>
      <p>Hi ${tenantName},</p>
      <p>Your response to the review from <strong>${reviewerName}</strong> has been successfully posted.</p>
      <br/>
      <p>Regards,</p>
      <p>The Diner SaaS Team</p>
    `,
  }),

  subscriptionPaid: (tenantName: string, amount: string): EmailData => ({
    to: "",
    subject: "Your subscription payment was successful",
    html: `
      <h1>Payment Confirmation</h1>
      <p>Hi ${tenantName},</p>
      <p>Thank you for your payment of <strong>${amount}</strong>. Your subscription is active.</p>
      <br/>
      <p>Regards,</p>
      <p>The Diner SaaS Team</p>
    `,
  }),
  
  subscriptionCancelled: (tenantName: string): EmailData => ({
    to: "",
    subject: "Your subscription has been cancelled",
    html: `
      <h1>Subscription Cancelled</h1>
      <p>Hi ${tenantName},</p>
      <p>Your subscription has been successfully cancelled. We're sorry to see you go.</p>
      <br/>
      <p>Regards,</p>
      <p>The Diner SaaS Team</p>
    `,
  }),
};
