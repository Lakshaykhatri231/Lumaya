import React, { Suspense, lazy, useState } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

// Three.js is heavy; it only downloads when the chat page actually shows the avatar
const VrmViewer = lazy(() => import('./VrmViewer'));

const STORAGE_KEY = 'lumaya_avatar_hidden';

const readHidden = () => {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
};

const AvatarPanel = ({ emotion, speaking, thinking }) => {
  const [hidden, setHidden] = useState(readHidden);

  const toggle = () => {
    setHidden((value) => {
      try { localStorage.setItem(STORAGE_KEY, value ? '0' : '1'); } catch { /* preference only */ }
      return !value;
    });
  };

  return (
    <aside className={`avatar-panel ${hidden ? 'avatar-panel-hidden' : ''}`} aria-label="Lumaya avatar">
      <button className="icon-button avatar-toggle" onClick={toggle} aria-label={hidden ? 'Show avatar' : 'Hide avatar'}>
        {hidden ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
      </button>
      {!hidden && (
        <div className="avatar-stage">
          <Suspense fallback={null}>
            <VrmViewer modelPath="/model.vrm" emotion={emotion} speaking={speaking} thinking={thinking} />
          </Suspense>
        </div>
      )}
    </aside>
  );
};

export default AvatarPanel;
