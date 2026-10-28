import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/LumayaLogo.png"; // use your logo image

const Navbar = ({ user, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate("/");
  };

  const handleLogout = () => {
    setMenuOpen(false); // Close mobile menu
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <nav style={{position: 'sticky', top:0, zIndex:'1000'}} className="navbar">
      <div className="navbar-logo" onClick={handleLogoClick} style={{ cursor: "pointer" }}>
        <img style={{transform: 'scale(1)'}} src={logo} alt="Logo" />
        <span style={{color:'#ffc107', fontSize:'20px'}} className="brand-name">Lumaya</span>
      </div>

      <div className="navbar-links">
        {/* Show Chat button only when user is signed in */}
        {user && (
          <button 
            style={{
              backgroundColor: "#f8b404",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: "100px",
              fontWeight: "bold",
              marginRight: "10px",
              cursor: "pointer",
            }} 
            onClick={() => navigate("/chat")}
          >
            Chat
          </button>
        )}
        
        {/* Conditional rendering based on user authentication */}
        {user ? (
          <button  
            style={{
              backgroundColor: "#f8b404",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: "100px",
              fontWeight: "bold",
              marginRight: "10px",
              cursor: "pointer",
            }} 
            onClick={handleLogout}
          >
            Logout
          </button>
        ) : (
          <button  
            style={{
              backgroundColor: "#f8b404",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: "100px",
              fontWeight: "bold",
              marginRight: "10px",
              cursor: "pointer",
            }} 
            onClick={() => navigate("/auth")}
          >
            Get Started
          </button>
        )}
      </div>

      <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
        <div></div>
        <div></div>
        <div></div>
      </div>

      <div className={`mobile-menu ${menuOpen ? "show" : ""}`}>
        {/* Show Chat button in mobile menu only when user is signed in */}
        {user && (
          <button 
            onClick={() => { 
              setMenuOpen(false); 
              navigate("/chat"); 
            }}
          >
            Chat
          </button>
        )}
        
        {/* Conditional rendering for mobile menu */}
        {user ? (
          <button 
            onClick={handleLogout}
          >
            Logout
          </button>
        ) : (
          <button 
            onClick={() => { 
              setMenuOpen(false); 
              navigate("/auth"); 
            }}
          >
            Get Started
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;