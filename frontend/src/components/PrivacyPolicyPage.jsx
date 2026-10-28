import React from 'react';

const PrivacyPolicyPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-primary mb-8">Privacy Notice for Xryptt</h1>
      <div className="prose prose-lg text-primary/80 space-y-6">
        <p>At Xryptt, we are committed to protecting your privacy. This Privacy Notice explains how we collect, use, and safeguard your personal information when you use our services.</p>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">1. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          
          <h3 className="text-xl font-semibold text-primary mt-6 mb-3">Personal Information</h3>
          <ul className="list-disc ml-6">
            <li>Account Information: Name, email address, and payment details.</li>
            <li>Usage Data: IP address, browser type, device information, and usage patterns.</li>
            <li>Wallet Information: Wallet addresses and transaction data (if you choose to connect your wallet).</li>
          </ul>

          <h3 className="text-xl font-semibold text-primary mt-6 mb-3">Non-Personal Information</h3>
          <ul className="list-disc ml-6">
            <li>Aggregated data that cannot be used to identify you.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc ml-6">
            <li>Provide and improve our services.</li>
            <li>Process payments and manage subscriptions.</li>
            <li>Send you updates, alerts, and promotional materials (if you opt-in).</li>
            <li>Monitor and analyze usage trends.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">3. Sharing Your Information</h2>
          <p>We do not sell your personal information. We may share your information with:</p>
          <ul className="list-disc ml-6">
            <li>Service Providers: Third-party vendors who help us operate our services (e.g., payment processors).</li>
            <li>Legal Requirements: If required by law or to protect our rights.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">4. Data Security</h2>
          <p>We use industry-standard security measures to protect your information, including encryption and secure servers. However, no method of transmission over the internet is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc ml-6">
            <li>Access, update, or delete your personal information.</li>
            <li>Opt-out of marketing communications.</li>
            <li>Request a copy of your data.</li>
          </ul>
          <p>To exercise these rights, contact us at xryptt@gmail.com.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">6. Changes to This Notice</h2>
          <p>We may update this Privacy Notice from time to time. Any changes will be posted on this page with an updated "Last Updated" date.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4">7. Contact Us</h2>
          <p>If you have any questions about this Privacy Notice, please contact us at:</p>
          <p>Email: xryptt@gmail.com</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;