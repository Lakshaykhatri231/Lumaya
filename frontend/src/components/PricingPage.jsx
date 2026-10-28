import React from 'react';
import { useNavigate } from 'react-router-dom';
import { initializePaddle } from "@paddle/paddle-js";
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase1.js';

const PricingPage = () => {
  const [paddle, setPaddle] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    initializePaddle({
      environment: "production",
      token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
    }).then((paddleInstance) => setPaddle(paddleInstance));
  }, []);

  const handleCheckout = (priceId) => {
    if (!paddle) {
      console.error("Paddle not initialized");
      return;
    }

    // Check if user is authenticated by looking for auth token
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      // Redirect to auth page if not authenticated
      navigate('/auth', { state: { from: '/pricing' } });
      return;
    }

    // Get the current user details from Supabase
    const fetchUserDetails = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(authToken);
        if (error) throw error;
        
        // Now you have the user's ID
        const userId = user.id;
        
        // Open Paddle checkout with the updated format
        paddle.Checkout.open({
          items: [
            {
              priceId: priceId,
              quantity: 1,
            },
          ],
          customer: {
            // email: user.email, // Include user email if available
            id: userId, // Use Supabase User ID as customer ID
          },
          customData: {
            supabaseUserId: userId // Store user ID in custom data
          },
          settings: {
            displayMode: "overlay",
            theme: "dark",
            successUrl: "https://xryptt.com/success",
          },
        });
      } catch (err) {
        console.error("Failed to get user details:", err);
      }
    };
    
    fetchUserDetails();
  };

  return (
    <div className="py-12 bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
          Simple, Transparent Pricing
        </h2>
        <p className="mt-4 text-xl text-gray-600">
          Choose the plan that best fits your investment goals
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* First Row */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Starter Plan */}
          <div className="bg-black rounded-3xl shadow-2xl overflow-hidden text-white transform hover:scale-105 transition-transform duration-300 flex flex-col">
            <div className="px-8 py-10 flex-grow">
              <h3 className="text-2xl font-bold">Starter</h3>
              <p className="mt-4 text-gray-400">Perfect for beginners to track whales</p>
              <div className="mt-8 flex items-start">
                <span className="text-5xl font-extrabold">$19</span>
                <span className="text-gray-400 ml-2 mt-2">/month</span>
              </div>
              <ul className="mt-10 space-y-4">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Track up to 3 wallets</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Identify short-term whales</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Real-time notifications</span>
                </li>
              </ul>
            </div>
            <div className="px-8 py-5 mt-auto">
              <button 
                onClick={() => handleCheckout("pri_01jnrexyz6v8dy126m9a9g3mfw")}
                className="w-full py-3 px-4 rounded-xl text-black font-bold bg-white hover:bg-gray-100 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-black rounded-3xl shadow-2xl overflow-hidden text-white transform hover:scale-105 transition-transform duration-300 border-2 border-black flex flex-col">
            <div className="px-8 py-10 flex-grow">
              <h3 className="text-2xl font-bold">Pro</h3>
              <p className="mt-4 text-gray-400">For active investors looking for more insights</p>
              <div className="mt-8 flex items-start">
                <span className="text-5xl font-extrabold">$30</span>
                <span className="text-gray-400 ml-2 mt-2">/month</span>
              </div>
              <ul className="mt-10 space-y-4">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Track up to 6 wallets</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Identify short-term whales</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Real-time notifications</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Priority support</span>
                </li>
              </ul>
            </div>
            <div className="px-8 py-5 mt-auto">
              <button 
                onClick={() => handleCheckout("pri_01jnrffepknte5yy0ymn1xwd6s")}
                className="w-full py-3 px-4 rounded-xl text-black font-bold bg-white hover:bg-gray-100 transition-colors"
              >
                Subscribe Now
              </button>
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Privacy Shield Plan */}
          <div className="bg-black rounded-3xl shadow-2xl overflow-hidden text-white transform hover:scale-105 transition-transform duration-300 flex flex-col">
            <div className="px-8 py-10 flex-grow">
              <h3 className="text-2xl font-bold">Privacy Shield</h3>
              <p className="mt-4 text-gray-400">Protect your wallet from being tracked</p>
              <div className="mt-8 flex items-start">
                <span className="text-5xl font-extrabold">$299</span>
                <span className="text-gray-400 ml-2 mt-2">/month</span>
              </div>
              <ul className="mt-10 space-y-4">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Prevent your wallet from being tracked by others</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Advanced privacy settings</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">24/7 dedicated support</span>
                </li>
              </ul>
            </div>
            <div className="px-8 py-5 mt-auto">
              <button 
                onClick={() => handleCheckout("pri_01jnrfmd82v596b1jytnm5bkm1")}
                className="w-full py-3 px-4 rounded-xl text-black font-bold bg-white hover:bg-gray-100 transition-colors"
              >
                Get Protected
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;


{/* Whale Mimic Plan */}
          {/* <div className="bg-black rounded-3xl shadow-2xl overflow-hidden text-white transform hover:scale-105 transition-transform duration-300 flex flex-col">
            <div className="px-8 py-10 flex-grow">
              <h3 className="text-2xl font-bold">Whale Mimic</h3>
              <p className="mt-4 text-gray-400">Replicate whale moves seamlessly</p>
              <div className="mt-8 flex items-start">
                <span className="text-5xl font-extrabold">$1000</span>
                <span className="text-gray-400 ml-2 mt-2">/month</span>
              </div>
              <ul className="mt-10 space-y-4">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Mimic whale wallet transactions</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Transactions executed on your own wallet</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Custom analytics and real-time syncing</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ml-3">Priority support and integration</span>
                </li>
              </ul>
            </div>
            <div className="px-8 py-5 mt-auto">
              <button className="w-full py-3 px-4 rounded-xl text-black font-bold bg-white hover:bg-gray-100 transition-colors">
                Start Mimicking
              </button>
            </div>
          </div> */}