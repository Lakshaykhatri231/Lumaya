import React, { useState } from 'react';
import { generateTherapyResponse } from '../services/geminiService';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const MentalHealthPlan = () => {
  const [formData, setFormData] = useState({
    goals: '',
    challenges: '',
    currentStrategies: '',
    supportSystem: ''
  });
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);

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
        Please create a personalized mental health plan based on the following information:
        Goals: ${formData.goals}
        Current Challenges: ${formData.challenges}
        Current Coping Strategies: ${formData.currentStrategies}
        Support System: ${formData.supportSystem}
      `;
      const response = await generateTherapyResponse(prompt, 'mental-health');
      setPlan(response);
    } catch (error) {
      console.error('Error generating mental health plan:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">Mental Health Plan</h1>
          <p className="text-xl text-primary/80">
            Create your personalized mental wellness strategy with AI guidance
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-primary font-medium mb-2">
                  What are your mental health goals?
                </label>
                <textarea
                  name="goals"
                  value={formData.goals}
                  onChange={handleChange}
                  className="w-full h-32 p-4 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g., Reduce anxiety, improve sleep..."
                />
              </div>

              <div>
                <label className="block text-primary font-medium mb-2">
                  What challenges are you facing?
                </label>
                <textarea
                  name="challenges"
                  value={formData.challenges}
                  onChange={handleChange}
                  className="w-full h-32 p-4 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g., Work stress, relationship issues..."
                />
              </div>

              <div>
                <label className="block text-primary font-medium mb-2">
                  What strategies are you currently using?
                </label>
                <textarea
                  name="currentStrategies"
                  value={formData.currentStrategies}
                  onChange={handleChange}
                  className="w-full h-32 p-4 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g., Meditation, exercise..."
                />
              </div>

              <div>
                <label className="block text-primary font-medium mb-2">
                  Who is in your support system?
                </label>
                <textarea
                  name="supportSystem"
                  value={formData.supportSystem}
                  onChange={handleChange}
                  className="w-full h-32 p-4 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g., Family, friends, therapist..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || !Object.values(formData).every(val => val.trim())}
                className="w-full py-3 px-6 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                Generate Plan
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
                <p className="text-primary/60 mt-4">Creating your personalized plan...</p>
              </div>
            ) : plan ? (
              <div className="bg-background-secondary p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-primary mb-4">Your Mental Health Plan</h2>
                <div className="prose text-primary/80">
                  {plan}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-primary/60">
                <p>Fill out the form to receive your personalized mental health plan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentalHealthPlan;