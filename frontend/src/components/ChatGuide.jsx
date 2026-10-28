import React from 'react';
import Footer from './Footer';

const AboutUsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-background text-primary border-b border-primary/10 w-full">
        <div id="aboutUsHeading" className="max-w mx-auto px-4 py-24">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-center">
              About Wallet Monitor
            </h1>
            <p className="text-xl md:text-2xl text-primary/80 mb-8 text-center">
              Revolutionizing crypto investment intelligence with real-time insights
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div id="AboutUsMainContent" className="max-w-[90%] mx-auto px-4 py-16">
        <div className="space-y-16">
          {/* Mission Section */}
          <section id="aboutUsSection">
            <h2 className="text-3xl font-bold text-primary mb-6">Our Mission</h2>
            <p className="text-lg text-primary/80">
              We aim to provide transparency and clarity in the cryptocurrency market by offering advanced tools that bridge the gap between complex blockchain data and actionable insights. Our mission is to enable every user to stay ahead in the crypto space, track key market players, and uncover trends that drive significant investment opportunities.
            </p>
          </section>

          {/* What We Offer Section */}
          <section section id="aboutUsSection2">
            <h2 className="text-3xl font-bold text-primary mb-6">What We Offer</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-primary mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-primary">Wallet Tracking</h3>
                    <p className="text-primary/70">Monitor up to six wallets with real-time updates</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-primary mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-primary">Portfolio Insights</h3>
                    <p className="text-primary/70">Access detailed portfolios of token holders</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-primary mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-primary">Whale Tracking</h3>
                    <p className="text-primary/70">Identify and track market-moving players</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-primary mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-primary">Privacy Features</h3>
                    <p className="text-primary/70">Advanced privacy settings for your transactions</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Why Choose Us Section */}
          <section section id="aboutUsSection">
            <h2 className="text-3xl font-bold text-primary mb-6">Why Choose Us</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-background-secondary p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-primary mb-3">Real-Time Notifications</h3>
                <p className="text-primary/70">Stay updated with instant alerts on critical market movements and wallet activities.</p>
              </div>
              <div className="bg-background-secondary p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-primary mb-3">Advanced Analytics</h3>
                <p className="text-primary/70">Gain insights into token holder distributions and transaction histories.</p>
              </div>
              <div className="bg-background-secondary p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-primary mb-3">Priority Support</h3>
                <p className="text-primary/70">Dedicated assistance to address your queries and ensure a smooth experience.</p>
              </div>
              <div className="bg-background-secondary p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-primary mb-3">Custom Solutions</h3>
                <p className="text-primary/70">Personalized analytics and features for professional investors.</p>
              </div>
            </div>
          </section>

          {/* Vision Section */}
          <section section id="aboutUsSection">
            <h2 className="text-3xl font-bold text-primary mb-6">Our Vision</h2>
            <p className="text-lg text-primary/80">
              We envision a world where every crypto investor, regardless of experience level, has access to tools that enhance their decision-making and maximize their returns. By simplifying complex blockchain data and delivering unparalleled insights, we strive to become the go-to platform for crypto investment intelligence.
            </p>
          </section>
        </div>
      </div>

      {/* <Footer /> */}
    </div>
  );
};

export default AboutUsPage;
