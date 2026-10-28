import React, { useState } from 'react';
import { generateTherapyResponse } from '../services/geminiService';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const LifePrediction = () => {
  const [formData, setFormData] = useState({
    currentSituation: '',
    aspirations: '',
    concerns: '',
    timeframe: '1 year'
  });
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);

  const timeframes = ['1 year', '3 years', '5 years', '10 years'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const prompt = `
        Based on the following information, please provide insights and guidance about potential future paths over the next ${formData.timeframe}:
        Current Situation: ${formData.currentSituation}
        Aspirations: ${formData.aspirations}
        Concerns: ${formData.concerns}
      `;
      const response = await generateTherapyResponse(prompt, 'life-prediction');
      setPrediction(response);
    } catch (error) {
      console.error('Error generating life prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">Life Path Insights</h1>
          <p className="text-xl text-primary/80">
            Explore potential future paths with AI-guided analysis
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-primary font-medium mb-2">
                  Describe your current situation
                </label>
                <textarea
                  name="currentSituation"
                  value={formData.currentSituation}
                  onChange={handleChange}
                  className="w-full h-32 p-4 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g., Career, relationships, personal growth..."
                />
              </div>

              <div>
                <label className="block text-primary font-medium mb-2">
                  What are your aspirations?
                </label>
                <textarea
                  name="aspirations"
                  value={formData.aspirations}
                  onChange={handleChange}
                  className="w-full h-32 p-4 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g., Career goals, personal development..."
                />
              </div>

              <div>
                <label className="block text-primary font-medium mb-2">
                  What concerns do you have?
                </label>
                <textarea
                  name="concerns"
                  value={formData.concerns}
                  onChange={handleChange}
                  className="w-full h-32 p-4 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g., Obstacles, uncertainties..."
                />
              </div>

              <div>
                <label className="block text-primary font-medium mb-2">
                  Timeframe
                </label>
                <select
                  name="timeframe"
                  value={formData.timeframe}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {timeframes.map(timeframe => (
                    <option key={timeframe} value={timeframe}>
                      {timeframe}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !Object.values(formData).every(val => val.trim())}
                className="w-full py-3 px-6 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                Generate Insights
              </button>
            </form>
          </div>

          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48">
                <DotLottieReact
                  src="https://lottie.host/b8087c9b-dcaa-43b3-8d0c-8ced0803325a/GqPRB9yLVk.lottie"
                  style={{ width: 100, height: 100 }}
                  loop
                  autoplay
                />
                <p className="text-primary/60 mt-4">Analyzing potential paths...</p>
              </div>
            ) : prediction ? (
              <div className="bg-background-secondary p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-primary mb-4">Your Life Path Insights</h2>
                <div className="prose text-primary/80">
                  {prediction}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-primary/60">
                <p>Share your information to receive personalized insights</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LifePrediction;