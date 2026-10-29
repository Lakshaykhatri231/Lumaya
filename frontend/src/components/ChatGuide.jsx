import React from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    icon: '👋',
    title: 'Start by saying hello',
    body: "Lumaya introduces itself and asks your name. Tell it as much or as little as you like. Over your first few conversations it gets to know you: what brings you here, what's going on in your life, what has helped before. That's what lets it talk to you, not at you."
  },
  {
    icon: '💬',
    title: 'Talk the way you would to a friend',
    body: "There's no format to follow. Share what's on your mind in your own words. Lumaya adjusts how it responds to how you're showing up: gentler and briefer when things are heavy, more practical when you want a way forward, more probing when you're ready to dig in."
  },
  {
    icon: '🧠',
    title: 'It remembers',
    body: "Lumaya keeps track of your conversation and, as it grows, condenses older parts into short summaries it can recall later. Come back tomorrow or next month and it can pick up where you left off, instead of starting from zero."
  },
  {
    icon: '➕',
    title: 'Start a new session any time',
    body: 'Use "New Session" in the sidebar for a fresh start. Your previous conversation is summarized and carried forward, so you get a clean page without losing the thread.'
  },
  {
    icon: '🌿',
    title: 'A gentle nudge',
    body: "If you go quiet for a little while after a reply, Lumaya may check in with a short question. No pressure. Reply when you're ready, or not at all."
  },
  {
    icon: '📓',
    title: 'Pair it with the journal',
    body: 'The Journal is for writing things down at your own pace. Lumaya reflects on each entry, tracks your mood over time, and shows patterns in the Insights tab.'
  }
];

const ChatGuide = () => (
  <div className="min-h-screen bg-amber-50">
    <section className="bg-gradient-to-br from-amber-50 to-orange-50 py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl lg:text-6xl font-bold text-amber-800 mb-6">Chat Guide</h1>
        <p className="text-lg lg:text-xl text-amber-700 max-w-3xl mx-auto">
          How to get the most out of talking with Lumaya
        </p>
      </div>
    </section>

    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-6 md:grid-cols-2">
        {STEPS.map(({ icon, title, body }) => (
          <div key={title} className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl" aria-hidden="true">{icon}</div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="py-16 bg-amber-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-8 border border-amber-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Good to know</h2>
          <ul className="space-y-3 text-gray-700 leading-relaxed list-disc pl-5">
            <li>Lumaya is an AI wellness companion. It is not a licensed therapist and can't diagnose or treat anything, and it isn't a substitute for professional care.</li>
            <li>
              Your safety comes first. If a message suggests you may be thinking of harming yourself, Lumaya shares crisis
              resources and pauses the chat for 24 hours so you can reach real people. In the US you can call or text <strong>988</strong>,
              or text <strong>HOME to 741741</strong>. In an emergency, call your local emergency number.
            </li>
            <li>Lumaya won't help with coding or technical questions. It's here for you, not for tasks.</li>
            <li>
              Your conversations are private. Read exactly what we store and who processes it in the{' '}
              <Link to="/privacy" className="text-amber-700 underline">Privacy Policy</Link>.
            </li>
          </ul>
          <div className="mt-8 text-center">
            <Link to="/chat" className="inline-block px-8 py-3 rounded-full bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors">
              Start chatting
            </Link>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default ChatGuide;
