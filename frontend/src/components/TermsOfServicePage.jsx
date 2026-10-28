import React from 'react';

const TermsOfServicePage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-primary mb-8">Terms of Service for Xryptt</h1>
      <div className="prose prose-lg text-primary/80 space-y-6">
        <p>By using Xryptt, you agree to these Terms of Service. Please read them carefully.</p>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">1. Eligibility</h2>
          <ul className="list-disc ml-6">
            <li>You must be at least 18 years old to use our services.</li>
            <li>You must comply with all applicable laws and regulations.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">2. Subscription Plans</h2>
          <ul className="list-disc ml-6">
            <li>Starter Plan: $19/month, tracks up to 3 wallets.</li>
            <li>Pro Plan: $30/month, tracks up to 6 wallets.</li>
            <li>Privacy Shield Plan: $299/month, prevents your wallet from being tracked.</li>
            {/* <li>Whale Mimic Plan: $1000/month, mimics whale wallet transactions.</li> */}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">3. Payment and Refunds</h2>
          <ul className="list-disc ml-6">
            <li>Payments are processed through our third-party payment provider.</li>
            <li>Refunds are available within 3 days of your initial subscription purchase. See our Refund Policy for details.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">4. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul className="list-disc ml-6">
            <li>Provide accurate and complete information.</li>
            <li>Not use our services for illegal or unauthorized purposes.</li>
            <li>Not attempt to reverse-engineer, hack, or disrupt our services.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">5. Intellectual Property</h2>
          <ul className="list-disc ml-6">
            <li>All content and software on Xryptt are owned by us or our licensors.</li>
            <li>You may not copy, modify, or distribute our content without permission.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">6. Limitation of Liability</h2>
          <ul className="list-disc ml-6">
            <li>We are not responsible for any losses or damages arising from your use of our services.</li>
            <li>Our total liability to you is limited to the amount you paid for your subscription.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">7. Termination</h2>
          <p>We may terminate your account if you violate these Terms of Service. You may cancel your subscription at any time.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">8. Changes to These Terms</h2>
          <p>We may update these Terms of Service from time to time. Any changes will be posted on this page with an updated "Last Updated" date.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">9. Contact Us</h2>
          <p>If you have any questions about these Terms of Service, please contact us at:</p>
          <p>Email: xryptt@gmail.com</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfServicePage;