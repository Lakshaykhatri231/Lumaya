import React from 'react';

// Mood is shown as a coloured dot beside the word, so the text stays on the theme ink in light and dark
const MOOD_DOTS = {
  positive: 'bg-green-500',
  negative: 'bg-rose-500',
  mixed: 'bg-amber-500',
  neutral: 'bg-gray-400'
};

export const MoodBadge = ({ mood }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize text-primary border border-primary/25">
    <span className={`h-2 w-2 rounded-full ${MOOD_DOTS[mood] || MOOD_DOTS.neutral}`} aria-hidden="true" />
    {mood || 'neutral'}
  </span>
);

export const TagChip = ({ children, onClick, onRemove, active = false }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${
      active ? 'bg-primary text-white border-primary' : 'bg-background-secondary text-primary border-primary/20'
    } ${onClick ? 'cursor-pointer hover:border-primary' : ''}`}
    onClick={onClick}
  >
    {children}
    {onRemove && (
      <button
        type="button"
        aria-label={`Remove tag ${children}`}
        className="ml-0.5 opacity-60 hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      >
        ×
      </button>
    )}
  </span>
);

export const Card = ({ title, children, className = '' }) => (
  <section className={`bg-background-secondary/60 border border-primary/10 rounded-2xl p-5 ${className}`}>
    {title && <h3 className="text-sm font-semibold uppercase tracking-wide text-primary/70 mb-3">{title}</h3>}
    {children}
  </section>
);

export const Spinner = ({ label = 'Loading' }) => (
  <div role="status" className="flex items-center gap-2 text-primary/60 text-sm py-6 justify-center">
    <span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    {label}…
  </div>
);

export const ErrorNote = ({ children }) =>
  children ? (
    <p role="alert" className="text-sm text-rose-600 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
      {children}
    </p>
  ) : null;

export const PrimaryButton = ({ className = '', ...props }) => (
  <button
    {...props}
    className={`px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
  />
);

export const GhostButton = ({ className = '', ...props }) => (
  <button
    {...props}
    className={`px-4 py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors ${className}`}
  />
);

export const formatDay = (dateKey) =>
  new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
