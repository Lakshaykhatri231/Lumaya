import React, { useState, useEffect } from "react";
import { Eye, EyeOff, User, Lock, Phone, Mail, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import './LoginForm.css';
import imgpodcasting from '../assets/Podcasting.png';

// Import the backend services and utilities
import { initiateSignUp, completeSignUp, signIn, initiatePasswordReset, completePasswordReset } from '../services/authService';
import { useToast } from '../hooks/useToast';
import { validateEmail } from '../utils/validation';

const AuthForm = ({ onAuthSuccess }) => {
  const [currentMode, setCurrentMode] = useState("signin"); // signin, signup, forgot, reset, verify
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Enhanced token detection on component mount
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    
    // Check for token in multiple locations
    const token = 
      hashParams.get('access_token') || 
      queryParams.get('token') ||
      sessionStorage.getItem('recoveryToken') ||
      window.location.hash.split('access_token=')[1]?.split('&')[0];

    if (token) {
      setResetToken(token);
      setCurrentMode('reset');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Store token temporarily if needed
      sessionStorage.setItem('recoveryToken', token);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation for email (except reset mode)
    if (!validateEmail(email) && currentMode !== 'reset') {
      showError('Please enter a valid email address');
      return;
    }

    try {
      switch (currentMode) {
        case "signin":
          if (!password || password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
          }
          const { user } = await signIn(email, password);
          showSuccess('Successfully signed in!');
          if (onAuthSuccess) {
            onAuthSuccess(user);
          }
          break;

        case "signup":
          if (!password || password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
          }
          if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
          }
          await initiateSignUp(email, password);
          showSuccess('Verification code sent to your email');
          setCurrentMode("verify");
          break;

        case "forgot":
          await initiatePasswordReset(email);
          showSuccess('Password reset instructions sent to your email');
          break;

        case "reset":
          if (!newPassword || newPassword.length < 6) {
            showError('New password must be at least 6 characters');
            return;
          }
          if (newPassword !== confirmNewPassword) {
            showError('Passwords do not match');
            return;
          }
          if (!resetToken) {
            showError('Invalid reset token. Please use the link from your email.');
            return;
          }
          try {
            await completePasswordReset(newPassword);
            showSuccess('Password reset successful!');
            setCurrentMode("signin");
            // Clear the recovery token from storage
            sessionStorage.removeItem('recoveryToken');
            resetForm();
          } catch (error) {
            showError(error.message || 'Failed to reset password');
          }
          break;

        case "verify":
          if (!verificationCode) {
            showError('Please enter the verification code');
            return;
          }
          const signUpData = await completeSignUp(email, verificationCode);
          showSuccess('Email verified and account created!');
          if (onAuthSuccess) {
            onAuthSuccess(signUpData.user);
          }
          setCurrentMode("signin");
          resetForm();
          break;

        default:
          break;
      }
    } catch (error) {
      showError(error.message || 'An error occurred. Please try again.');
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setPhoneNumber("");
    setVerificationCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowPassword(false);
    setResetToken("");
  };

  const switchMode = (mode) => {
    setCurrentMode(mode);
    if (mode === "signin" || mode === "signup") {
      resetForm();
    }
  };

  const handleBackToSignIn = () => {
    setCurrentMode('signin');
    setResetToken('');
    // Clear any stored tokens
    sessionStorage.removeItem('recoveryToken');
    // Clear the reset token from URL when going back to sign in
    window.history.replaceState({}, document.title, window.location.pathname);
    resetForm();
  };

  const getTitle = () => {
    switch (currentMode) {
      case "signin": return "Welcome Back";
      case "signup": return "Create Account";
      case "forgot": return "Forgot Password";
      case "reset": return "Reset Password";
      case "verify": return "Verify Account";
      default: return "Welcome Back";
    }
  };

  const getSubtitle = () => {
    switch (currentMode) {
      case "signin": return "Welcome back! Please enter your details.";
      case "signup": return "Please fill in your details to create an account.";
      case "forgot": return "Enter your email to receive reset instructions.";
      case "reset": return "Enter verification code and your new password.";
      case "verify": return "Enter the verification code sent to your email.";
      default: return "Welcome back! Please enter your details.";
    }
  };

  const getButtonText = () => {
    switch (currentMode) {
      case "signin": return "Log In";
      case "signup": return "Sign Up";
      case "forgot": return "Send Reset Instructions";
      case "reset": return "Reset Password";
      case "verify": return "Verify Account";
      default: return "Submit";
    }
  };

  const renderForm = () => {
    switch (currentMode) {
      case "signin":
        return (
          <>
            <div className="login-input-group">
              <User className="icon" />
              <input
                type="email"
                placeholder="Enter your username/email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="login-input-group">
              <Lock className="icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </>
        );

      case "signup":
        return (
          <>
            <div className="login-input-group">
              <User className="icon" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="login-input-group">
              <Phone className="icon" />
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <div className="login-input-group">
              <Lock className="icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="login-input-group">
              <Lock className="icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </>
        );

      case "forgot":
        return (
          <div className="login-input-group">
            <Mail className="icon" />
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        );

      case "reset":
        return (
          <>
            <div className="login-input-group">
              <Lock className="icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="login-input-group">
              <Lock className="icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </>
        );

      case "verify":
        return (
          <div className="login-input-group">
            <KeyRound className="icon" />
            <input
              type="text"
              placeholder="Enter verification code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              maxLength={6}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderFooter = () => {
    switch (currentMode) {
      case "signin":
        return (
          <div className="login-footer">
            <span>New here?</span>
            <button type="button" onClick={() => switchMode("signup")}>Sign up</button>
            <span style={{ margin: '0 10px' }}>•</span>
            <button type="button" onClick={() => setCurrentMode("forgot")}>
              Forgot Password?
            </button>
          </div>
        );

      case "signup":
        return (
          <div className="signup-footer">
            <span>Already have an account?</span>
            <button type="button" onClick={() => switchMode("signin")}>Log in</button>
          </div>
        );

      case "forgot":
      case "verify":
        return (
          <div className="login-footer">
            <span>Remember your password?</span>
            <button type="button" onClick={() => switchMode("signin")}>Back to Login</button>
          </div>
        );

      case "reset":
        return (
          <div className="login-footer">
            <span>Remember your password?</span>
            <button type="button" onClick={handleBackToSignIn}>Back to Login</button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <img src={imgpodcasting} alt="Podcasting" className="login-image" />
      </div>
      <div className="login-right">
        <div className={currentMode === "signup" ? "signup-card" : "login-card"}>
          <h1 className="login-title">{getTitle()}</h1>
          <p className="login-subtitle">{getSubtitle()}</p>
          <form onSubmit={handleSubmit} className="login-form">
            {renderForm()}
            <button type="submit" className="login-btn">
              {getButtonText()}
            </button>
            {renderFooter()}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;