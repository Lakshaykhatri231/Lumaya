import React, { useState } from 'react';
import { generateTherapyResponse } from '../services/geminiService';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const RelationshipCoaching = () => {
  const [formData, setFormData] = useState({
    situation: '',
    challenges: '',
    goals: '',
    history: ''
  });
  const [advice, setAdvice] = useState('');
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
        Please provide relationship guidance based on the following:
        Current Situation: ${formData.situation}
        Challenges: ${formData.challenges}
        Relationship Goals: ${formData.goals}
        Relevant History: ${formData.history}
      `;
      const response = await generateTherapyResponse(prompt, 'relationship');
      setAdvice(response);
    } catch (error) {
      console.error('Error generating relationship advice:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">Relationship Coaching</h1>
          <p className="text-xl text-primary/80">
            Get personalized guidance for healthier relationships
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-primary font-medium mb-2">
                  Describe your current relationship situation
                </label>
                <textarea
                  name="situation"
                  value={formData.situation}
                  onChange={handleChange}
                  className="w-full h-32 p-4 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g., Dating, married, seeking relationship..."
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
                  placeholder="e.g., Communication issues, trust concerns..."
                />
              </div>

              <div>
                <label className="block text-primary font-medium mb-2">
                  What are your relationship goals?
                </label>
                <textarea
                  name="goals"
                  value={formData.goals}
                  onChange={handleChange}
                  className="w-full h-32 p-4 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g., Better communication, deeper connection..."
                />
              </div>

              <div>
                <label className="block text-primary font-medium mb-2">
                  Any relevant relationship history?
                </label>
                <textarea
                  name="history"
                  value={formData.history}
                  onChange={handleChange}
                  className="w-full h-32 p-4 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g., Past experiences, patterns..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || !Object.values(formData).every(val => val.trim())}
                className="w-full py-3 px-6 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                Get Guidance
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
                <p className="text-primary/60 mt-4">Analyzing your situation...</p>
              </div>
            ) : advice ? (
              <div className="bg-background-secondary p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-primary mb-4">Relationship Guidance</h2>
                <div className="prose text-primary/80">
                  {advice}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-primary/60">
                <p>Share your situation to receive personalized relationship guidance</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelationshipCoaching;