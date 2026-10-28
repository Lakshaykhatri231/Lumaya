import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import HighlightSection from "./HighlightSection";
import FAQComponent from "./FAQComponent";
import img3 from './assets/LumayaLogo.jpg';
import Svgmair from "./Svgmair";
import SvgSecond from "./SvgSecond";


const Homepage = () => {
  const navigate = useNavigate();

  const handleStartClick = () => {
    navigate("/chat");
  };

  const handleAboutClick = () => {
    navigate("/about");
  };

  const TypewriterText = ({ text, speed = 100 }) => {
    const [displayedText, setDisplayedText] = useState("");
    const [index, setIndex] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setDisplayedText((prev) => text.slice(0, (index % (text.length + 1))));
        setIndex((prev) => (prev + 1) % (text.length + 1));
      }, speed);

      return () => clearInterval(interval);
    }, [index, text, speed]);

    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="typewriter-text"
      >
        {displayedText}
        <span className="cursor">|</span>
      </motion.span>
    );
  };

  return (
    <div className="container">
      <div className="app">
        <main className="main">
          <section className="hero">

            <div className="content">


              <p className="highlight">YOUR MIND, MADE LIGHTER</p>
              <h1 className="title">
                <strong>
                  Talk. Feel Understood. <TypewriterText text="Grow." speed={200} />
                </strong>
              </h1>

              <div className="tag-main">
                <div className="tags">
                  {[
                    "Personal Reflections",
                    "Non-Judgemental Listening",
                    "Always Available",
                    "Thoughtful Conversations",
                    "Empathy, Not Scripts",
                    "Privacy First",
                  ].map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="cta-buttons" onClick={handleStartClick} style={{ cursor: "pointer" }}>
                <button className="cta">
                  <span className="cta-text">Start Talking</span>
                  <span className="cta-arrow">→</span>
                </button>
              </div>
            </div>


          </section>

          <section className="second info">
            <div className="info-text">
              <h1 className="width space">
                You Deserve A Space To Feel Safe, Heard, And Understood.
              </h1>
              <h4 className="width">
                No scripts. Just empathy and reflection that feels real.
                Start with a calming conversation

              </h4>
              <p className="width">
                Feeling stuck or just need to talk? This is your space. Always here, always private — for real conversations that help you breathe a little easier.
              </p>
              <button style={{ marginTop: '25px' }} className="cta-black" onClick={handleStartClick}>
                <span className="cta-black-text">Start Healing</span>
                <span className="cta-black-arrow">→</span>
              </button>

            </div>
            <div className="info-image">
              <Svgmair />
            </div>
          </section>
        </main>
      </div>

      <HighlightSection />

      <section className="testimonial" style={{ '--bg-image': `url(${img3})` }}>
        <img
          src={img3}
          alt="Customer"
          className="testimonial-image"
        />
        <div>
          <h1>What Makes Us Different?</h1>
          <p>
            Lumaya is built to feel genuinely human — it listens without rushing to fix, adds natural pauses, and responds with honesty when unsure. Shaped by insights from psychologists and real conversations, it gently remembers your past interactions and speaks with warmth and nuance.
          </p>
        </div>
      </section>

      {/* Feature Box */}
      <section className="feature-box">
        <div className="feature-text">
          <h1 style={{ width: '37vw' }}>Grow emotionally with clarity and confidence.</h1>
          <ul>
            <li>Build emotional resilience, one conversation at a time.</li>
            <li>Clarify your thoughts with kind, guided reflection.</li>
            <li>Unlock insights through mindful daily check-ins.</li>
            <li>Learn how to set healthy emotional boundaries.</li>
            <li>Reframe your self-talk for confidence & calm.</li>
          </ul>
          {/* <button className="cta">Open Up →</button> */}
          <div className="cta-wrapper">
            <button className="cta" onClick={handleStartClick}>Open Up →</button>
          </div>

        </div>
        <div className="feature-img">
          <SvgSecond />
        </div>
      </section>


      {/* FAQ */}
      <FAQComponent />

      {/* Footer CTA */}
      <footer className="footer-cta">
        <div>
          <h1>There's a reason we care so much</h1>
          <p>It all started with a deep need to make support accessible.</p>
        </div>
        <button className="footers-button" onClick={handleAboutClick}>discover our purpose →</button>
      </footer>
    </div>
  );
};

export default Homepage;