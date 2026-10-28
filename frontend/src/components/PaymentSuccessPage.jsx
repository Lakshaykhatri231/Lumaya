import React from 'react';
import Footer from './Footer';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const Success = () => {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <div className="w-64 h-64 mx-auto mb-8">
              <DotLottieReact
                src="https://lottie.host/2e26099f-2c4d-4411-9d5c-68f6eaef2c0c/sPNwKNB0Hs.lottie"
                loop={false}
                autoplay
              />
            </div>
            
            <h1 className="text-4xl font-bold text-primary mb-4">
              Payment Successful!
            </h1>
            
            <p className="text-xl text-primary/80 mb-8">
              Thank you for subscribing to our service. Your account has been upgraded and you now have access to all features.
            </p>
            
            <div className="space-y-4">
              {/* <Link
                to="/dashboard"
                className="inline-block w-full sm:w-auto px-8 py-4 bg-primary text-background rounded-lg font-semibold text-lg hover:bg-primary-hover transition-colors duration-200"
              >
                Go to Dashboard
              </Link> */}
              
              <div className="mt-4">
                {/* <Link
                  to="/"
                  className="text-primary hover:text-primary-hover"
                >
                  Return to Home
                </Link> */}
              </div>
            </div>
          </div>
        </div>
    );
};

export default Success ;
