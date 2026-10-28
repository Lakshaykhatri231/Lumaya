import React from 'react';
import Footer from './Footer';

const AboutUsPage = () => {
  return (
    <div className="min-h-screen bg-amber-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold text-amber-800 mb-6">
            About Us
          </h1>
          <p className="text-lg lg:text-xl text-amber-700 max-w-3xl mx-auto">
            Making mental wellness more accessible, relatable, and judgment-free for everyone
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block w-16 h-16 bg-amber-100 rounded-full mb-6 flex items-center justify-center">
              <div className="text-2xl">🧠</div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">Our Mission</h2>
          </div>
          <div className="bg-amber-50 rounded-2xl p-8 lg:p-10 border border-amber-200">
            <p className="text-lg text-gray-700 leading-relaxed text-center">
              We're a small, passionate team on a mission to make mental wellness more accessible, relatable, and judgment-free — especially for those who may not feel ready (or able) to seek traditional therapy. Our platform acts as a digital wellness companion, designed to bridge the gap between silence and support. It's a space where you can think out loud, reflect on your emotions, and get gentle guidance — anytime, anywhere.
            </p>
          </div>
        </div>
      </section>

      {/* Why We Built This Section */}
      <section className="py-16 bg-amber-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block w-16 h-16 bg-amber-200 rounded-full mb-6 flex items-center justify-center">
                <div className="text-2xl">💭</div>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">Why We Built This</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                In a world where stress, overthinking, and emotional overwhelm have become daily struggles, many people are turning to tech for relief — but most tools feel robotic, generic, or transactional.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                We wanted to change that. So, we created a system that listens better, responds with empathy, and improves the more you engage with it — without ever compromising your privacy.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-amber-100">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="text-amber-600">🤖</div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Not Robotic</h3>
                    <p className="text-gray-600 text-sm">Genuine, empathetic responses</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="text-amber-600">🎯</div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Personalized</h3>
                    <p className="text-gray-600 text-sm">Tailored to your unique needs</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="text-amber-600">🔒</div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Private</h3>
                    <p className="text-gray-600 text-sm">Your data stays completely secure</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block w-16 h-16 bg-amber-100 rounded-full mb-6 flex items-center justify-center">
              <div className="text-2xl">💡</div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200">
              <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center mb-6">
                <div className="text-amber-700 text-xl">⚡</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Advanced Understanding</h3>
              <p className="text-gray-700 leading-relaxed">
                Behind the scenes, your companion uses advanced language models trained to understand patterns in how we think and feel.
              </p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200">
              <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center mb-6">
                <div className="text-amber-700 text-xl">🛡️</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Privacy First</h3>
              <p className="text-gray-700 leading-relaxed">
                The more context you give it, the more personal and helpful it becomes — while always keeping your data encrypted and invisible to any human eyes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-amber-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">What Makes Us Different</h2>
            <p className="text-lg text-gray-600">Three pillars that set us apart</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-amber-100">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                <div className="text-2xl">🤝</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Empathetic Responses</h3>
              <p className="text-gray-600 leading-relaxed">
                Unlike generic tools, our system responds with genuine empathy and understanding, making every interaction feel meaningful.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-amber-100">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                <div className="text-2xl">🔐</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Complete Privacy</h3>
              <p className="text-gray-600 leading-relaxed">
                Your conversations are encrypted and never seen by human eyes. Your privacy is sacred, and we protect it at all costs.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-amber-100">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                <div className="text-2xl">📈</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Adaptive Learning</h3>
              <p className="text-gray-600 leading-relaxed">
                The more you engage, the better we understand and support your unique journey towards mental wellness.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Belief Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block w-16 h-16 bg-amber-100 rounded-full mb-6 flex items-center justify-center">
            <div className="text-2xl">🌱</div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">Our Belief</h2>
          <div className="bg-amber-50 rounded-2xl p-8 lg:p-10 border-2 border-amber-200">
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              Everyone deserves a safe space to unpack their mind. Whether you're feeling stuck, burnt out, overwhelmed, or just need to vent — we're here to support you in becoming more grounded and self-aware.
            </p>
            <div className="w-16 h-0.5 bg-amber-300 mx-auto mb-6"></div>
            <p className="text-lg font-medium text-amber-800 italic">
              "Thank you for trusting us with your thoughts. We're honored to be a small part of your journey."
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-amber-600 to-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-amber-100 mb-8 max-w-2xl mx-auto">
            Take the first step towards better mental wellness. Your companion is ready to listen, understand, and support you.
          </p>
          <button className="bg-white text-amber-700 px-8 py-4 rounded-full text-lg font-semibold hover:bg-amber-50 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
            Get Started Today →
          </button>
        </div>
      </section>

      {/* <Footer /> */}
    </div>
  );
};

export default AboutUsPage;