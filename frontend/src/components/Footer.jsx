import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";
import logo from "../assets/LumayaLogo.png";


const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <img style={{width:'45px'}} src={logo} alt="Lumaya Logo" className="footer-logo" />

          <h2>Lumaya</h2>
          <p>Your mind, made lighter.</p>
        </div>
        <div className="footer-contact">
          <h4>Stay Connected</h4>
          <p>Email: support@thelumaya.com</p>
          <p><Link to="/privacy">Privacy Policy</Link> · <Link to="/chat-guide">Chat Guide</Link> · <Link to="/about">About</Link></p>
          <div className="social-icons">
            <a href="#"><i className="fab fa-facebook-f"></i></a>
            <a href="#"><i className="fab fa-twitter"></i></a>
            <a href="#"><i className="fab fa-instagram"></i></a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Lumaya. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
