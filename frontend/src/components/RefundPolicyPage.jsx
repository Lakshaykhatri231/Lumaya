import React from 'react';

const RefundPolicyPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-primary mb-8">Refund Policy for Xryptt</h1>
      <div className="prose prose-lg text-primary/80 space-y-6">
        <p>At Xryptt, we are committed to providing a high-quality service to our customers. However, we understand that there may be situations where you are not satisfied with your purchase. This refund policy outlines the terms and conditions for requesting a refund.</p>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">1. Eligibility for Refunds</h2>
          <p>Refunds are available under the following conditions:</p>
          <div className="ml-6">
            <p><strong>All Plans (Starter, Pro, Privacy Shield)</strong></p>
            <ul className="list-disc ml-6">
              <li>You may request a refund within 3 days of your initial subscription purchase.</li>
              <li>Refunds are only available for the first billing cycle.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">2. Non-Refundable Situations</h2>
          <p>Refunds will not be provided in the following cases:</p>
          <ul className="list-disc ml-6">
            <li>If you fail to cancel your subscription before the next billing cycle.</li>
            <li>If you violate our Terms of Service.</li>
            <li>If you request a refund after the 3-day refund period has expired.</li>
            <li>If you have used the service extensively (e.g., tracked multiple wallets, accessed advanced features, or executed transactions).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">3. How to Request a Refund</h2>
          <p>To request a refund, please follow these steps:</p>
          <ol className="list-decimal ml-6">
            <li>Contact our support team at xryptt@gmail.com within 3 days of your initial subscription purchase.</li>
            <li>Provide your:
              <ul className="list-disc ml-6">
                <li>Full name</li>
                <li>Email address used for the subscription</li>
                <li>Reason for the refund request</li>
              </ul>
            </li>
          </ol>
          <p>Our team will review your request and process it within 5 business days.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">4. Refund Processing</h2>
          <ul className="list-disc ml-6">
            <li>Approved refunds will be credited to the original payment method within 7-10 business days.</li>
            <li>Refunds are processed in USD (or your local currency, depending on your payment method).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">5. Subscription Cancellation</h2>
          <ul className="list-disc ml-6">
            <li>You can cancel your subscription at any time to avoid future charges.</li>
            <li>Cancellations must be made at least 24 hours before the next billing cycle to avoid being charged.</li>
            <li>To cancel, log in to your account and follow the cancellation instructions or contact our support team at xryptt@gmail.com.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">6. Contact Us</h2>
          <p>If you have any questions about our refund policy, please contact us at:</p>
          <p>Email: xryptt@gmail.com</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">7. Changes to This Policy</h2>
          <p>We reserve the right to modify this refund policy at any time. Any changes will be posted on this page with an updated "Last Updated" date.</p>
        </section>
      </div>
    </div>
  );
};

export default RefundPolicyPage;