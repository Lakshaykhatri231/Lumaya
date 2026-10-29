import React from 'react';
import { Link } from 'react-router-dom';

const CONTACT_EMAIL = 'support@thelumaya.com';

const Section = ({ title, children }) => (
  <section className="bg-white rounded-2xl p-6 lg:p-8 border border-amber-200">
    <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
    <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
  </section>
);

const PROVIDERS = [
  ['Supabase', 'Accounts and sign-in, journal entries, subscription status'],
  ['Google (Gemini)', 'Generates Lumaya\'s replies, analyzes journal entries, and creates the embeddings used for memory'],
  ['Pinecone', 'Stores your long-term memory summaries as searchable vectors'],
  ['Redis host', 'Holds your live conversation, your profile, and short-lived safety flags'],
  ['Hugging Face', 'Labels the mood and topic of conversation summaries'],
  ['Resend', 'Sends verification and welcome emails'],
  ['Paddle', 'Processes payments as our merchant of record'],
  ['Render', 'Hosts the app and API']
];

// NOTE: this describes what the code does today. Have it reviewed before relying on it as legal text.
const PrivacyPolicy = () => (
  <div className="min-h-screen bg-amber-50">
    <section className="bg-gradient-to-br from-amber-50 to-orange-50 py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl lg:text-6xl font-bold text-amber-800 mb-6">Privacy Policy</h1>
        <p className="text-lg lg:text-xl text-amber-700 max-w-3xl mx-auto">
          What Lumaya stores about you, why, and who helps us run it
        </p>
      </div>
    </section>

    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <Section title="What Lumaya is">
        <p>
          Lumaya is an AI wellness companion. Your conversations and journal entries are processed by AI models to
          write replies and reflections. Lumaya is not a licensed therapist, and what you share with it is not
          protected by therapist–patient confidentiality.
        </p>
      </Section>

      <Section title="What we collect and keep">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Account:</strong> your email, your password (handled and hashed by Supabase, we never see it), and a phone number if you gave one.</li>
          <li><strong>Conversations:</strong> the messages in your current session, kept so Lumaya can follow the conversation. A copy also lives in your browser's local storage on the device you use.</li>
          <li><strong>Profile:</strong> your name and a short summary of what you shared while getting to know Lumaya (for example your life stage, work, and what you're hoping for).</li>
          <li><strong>Long-term memory:</strong> as a session grows, older parts are condensed into summaries tagged with a mood and topic and stored so Lumaya can recall them later. Summaries are stored as text alongside their vector embedding.</li>
          <li><strong>Journal:</strong> your entries plus the AI's analysis of each one (mood, emotions, themes, a short insight, a generated title and tags), and your reminder preferences.</li>
          <li><strong>Safety flags:</strong> if a message indicates a risk of self-harm, we record that message and a 24-hour pause on your chat.</li>
          <li><strong>Subscription:</strong> your plan and billing status. Card details go to Paddle, not to us.</li>
        </ul>
      </Section>

      <Section title="Why we use it">
        <p>
          To run Lumaya for you: to reply in context, remember you between sessions, show your journal and mood
          trends, keep you safe, and manage your account and subscription. We don't sell your data and we don't use it for advertising.
        </p>
      </Section>

      <Section title="Who processes it">
        <p>These providers handle data on our behalf, only to provide the service:</p>
        <ul className="divide-y divide-amber-100 border border-amber-100 rounded-lg">
          {PROVIDERS.map(([name, role]) => (
            <li key={name} className="px-4 py-2.5 flex flex-col sm:flex-row sm:gap-4">
              <span className="font-medium text-gray-900 sm:w-40 flex-shrink-0">{name}</span>
              <span>{role}</span>
            </li>
          ))}
        </ul>
        <p>Some of these providers process data outside your country.</p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Conversations, your profile, and long-term memory are kept until you ask us to delete them. Safety pauses lift
          automatically after 24 hours. Journal entries stay until you delete them from the Journal.
        </p>
      </Section>

      <Section title="Your choices">
        <ul className="list-disc pl-5 space-y-2">
          <li>Delete any journal entry from the Journal, and export your entries from the History tab.</li>
          <li>Start a "New Session" to move on from a conversation. Its summary is carried forward.</li>
          <li>
            To access, correct, or delete your account and everything linked to it (conversations, profile, memory,
            journal), email <a className="text-amber-700 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </li>
        </ul>
      </Section>

      <Section title="Security">
        <p>
          Traffic is encrypted in transit, journal data is isolated per user in the database, and access to the service
          requires signing in. No system is perfectly secure, so please avoid sharing information you wouldn't want stored.
        </p>
      </Section>

      <Section title="If you're in crisis">
        <p>
          Lumaya can't provide emergency help. In the US, call or text <strong>988</strong>, or text <strong>HOME to 741741</strong>.
          Elsewhere, contact your local emergency number or a local crisis line.
        </p>
      </Section>

      <p className="text-center text-sm text-gray-600">
        Questions? <a className="text-amber-700 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ·{' '}
        <Link to="/chat-guide" className="text-amber-700 underline">Chat Guide</Link>
      </p>
    </div>
  </div>
);

export default PrivacyPolicy;
