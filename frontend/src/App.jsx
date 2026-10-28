import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import HomePage from './HomePage.jsx';
import "./App.css";
import ChatInterface from './components/new.jsx';
import DreamInterpreter from './components/DreamInterpreter';
import MentalHealthPlan from './components/MentalHealthPlan';
import RelationshipCoaching from './components/RelationshipCoaching';
import LifePrediction from './components/LifePrediction';
import AuthForm from './components/AuthForm';
import { ThemeProvider } from './context/ThemeContext';
import Footer from './components/Footer';
import AboutUsPage from './components/AboutUsPage';
import ChatGuide from './components/ChatGuide';
import PrivacyPolicy from './components/PrivacyPolicy';
import { checkAuthStatus, signOut } from './services/authService.js';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { user } = await checkAuthStatus();
        setUser(user);
      } catch (error) {
        console.error("Error initializing auth:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Check for existing session on app load




  // Handle auth redirects on first load
  useEffect(() => {
    if (location.pathname.startsWith('/authorisation')) {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const queryParams = new URLSearchParams(location.search);

      const token =
        queryParams.get('token') ||
        hashParams.get('access_token') ||
        (location.search.includes('token=')
          ? location.search.split('token=')[1]?.split('&')[0]
          : null);

      const type = queryParams.get('type') || hashParams.get('type');

      console.log("Detected token:", token);
      console.log("Detected type:", type);

      if (token && type === 'recovery') {
        sessionStorage.setItem('recoveryToken', token);
        console.log("Recovery token stored.");
      }

      // Redirect to auth form
      navigate('/auth', { state: { from: location.pathname } });
    }
  }, [location, navigate]);

  const handleAuthSuccess = (userData) => {
    console.log("Authentication successful", userData);
    setUser(userData);

    // Navigate to the intended path if it exists, otherwise go home
    const intendedPath = location.state?.from || '/';
    navigate(intendedPath);

    // Clean up any tokens
    sessionStorage.removeItem('recoveryToken');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
      navigate('/');
      // Clean up any stored tokens
      sessionStorage.removeItem('recoveryToken');
      localStorage.removeItem('authToken');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Define navLinks array to pass to the Navbar component
  const navLinks = [
    { path: '/chat', label: 'Chat' },
    { path: '/mental-health', label: 'Mental Health' },
    { path: '/relationship', label: 'Relationship' },
    { path: '/life-prediction', label: 'Life Prediction' },
    { path: '/dream-interpreter', label: 'Dream Interpreter' }
  ];

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background transition-colors duration-200">
        {location.pathname !== '/chat' && (
          <Navbar
            user={user}
            onLogout={handleLogout}
            navLinks={navLinks}
          />
        )}

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatInterface user={user} />} />
          <Route path="/dream-interpreter" element={<DreamInterpreter user={user} />} />
          <Route path="/mental-health" element={<MentalHealthPlan user={user} />} />
          <Route path="/relationship" element={<RelationshipCoaching user={user} />} />
          <Route path="/life-prediction" element={<LifePrediction user={user} />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/chat-guide" element={<ChatGuide />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route
            path="/auth"
            element={
              <div className="container mx-auto px-4 py-8">
                <AuthForm onAuthSuccess={handleAuthSuccess} />
              </div>
            }
          />
          <Route path="*" element={<HomePage />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            className: 'bg-background text-accent',
          }}
        />

        {location.pathname !== '/chat' && <Footer />}
      </div>
    </ThemeProvider>
  );
}

export default App;