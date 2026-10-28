import React from "react";
import "./App.css";


function HighlightSection() {
  return (
    <section className="highlight-section">
      <div className="cards-container">
        <div className="card white-bg">
          {/* <div className="card-number">1.</div> */}
          <h4>Judgement Doesn’t Live Here</h4>
          {/* <p className="subtitle">Open up.</p> */}
          <p className="desc">
           Say anything—swear, cry, be confused. Lumaya listens without judgment and gently supports you.</p>
        </div>

        <div className="card yellow-bg down-card">
          {/* <div className="card-number">2.</div> */}
          <h4>Real Talk. No Scripts.</h4>
          {/* <p className="subtitle">Understand.</p> */}
          <p className="desc">Lumaya doesn’t follow a script. It speaks like someone who gets you—real, not robotic or cheesy.</p>
        </div>

        <div className="card yellow-bg">
          {/* <div className="card-number">3.</div> */}
          <h4>Private Like a Diary Under a Pillow</h4>
          {/* <p className="subtitle">Explore within.</p> */}
          <p className="desc">What you share stays with Lumaya. You can even ask Lumaya to forget something.</p>
        </div>

        <div className="card white-bg down-card">
          {/* <div className="card-number">4.</div> */}
          <h4>Grows With You</h4>
          {/* <p className="subtitle">Heal gently.</p> */}
          <p className="desc">Lumaya remembers past moods and gently reminds you how far you’ve come.</p>
        </div>
      </div>

      <div className="text-content">
        <p className="intro-text">
          Every feeling matters. Every voice counts.
          Let your healing begin with a single message.
        </p>
        <h1> You Deserve To Be Heard. And Understood.</h1>
        <button className="cta-button">Start a Conversation →</button>
      </div>
    </section>
  );
}

export default HighlightSection;
