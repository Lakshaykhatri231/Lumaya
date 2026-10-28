// Get the API base URL dynamically
import { supabase } from "../utils/supabase1";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';


// export const getCurrentUser = async () => {
//   try {
//     const response = await fetch(`${API_BASE_URL}/auth/user`, {
//       method: 'GET',
//       credentials: 'include',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.error);
//     }

//     const { user } = await response.json();
//     return user;
//   } catch (error) {
//     console.error('Error getting current user:', error);
//     throw error;
//   }
// };

export const initiateSignUp = async (email, password, phoneNumber) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup/initiate`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, phoneNumber }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return await response.json();
  } catch (error) {
    console.error('Error initiating signup:', error);
    throw new Error('Failed to send verification email. Please try again.');
  }
};

export const completeSignUp = async (email, otp) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup/complete`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    
    // Store the token if it's included in the response
    if (data.session?.access_token) {
      localStorage.setItem('authToken', data.session.access_token);
    }
    if (data.user?.id) {
      localStorage.setItem('userId', data.user.id);
      
      // Use the getSessionId function to handle session ID logic
      getSessionId(data.user.id);
    }

    return data;
  } catch (error) {
    console.error('Error completing signup:', error);
    throw error;
  }
};

export const signIn = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    
    // Store the token if it's included in the response
    if (data.session?.access_token) {
      localStorage.setItem('authToken', data.session.access_token);
    }
    if (data.user?.id) {
      localStorage.setItem('userId', data.user.id);
      
      // Use the getSessionId function to handle session ID logic
      getSessionId(data.user.id);
    }

    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

const handleApiResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'An unexpected error occurred');
  }
  return data;
};

export const initiatePasswordReset = async (email) => {
  try {
  const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${FRONTEND_URL}/authorisation`
});

    
    if (error) throw error;
    return { message: 'Password reset email sent successfully' };
  } catch (error) {
    console.error('Error initiating password reset:', error);
    throw new Error('Failed to send password reset email. Please try again.');
  }
};

export const completePasswordReset = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    return { message: 'Password reset successful' };
  } catch (error) {
    console.error('Error completing password reset:', error);
    throw error;
  }
};

export const checkAuthStatus = async () => {
  try {
    // First check localStorage for token
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      return { user: null };
    }
    
    // Verify token with backend
    const { data, error } = await supabase.auth.getUser(authToken);
    
    if (error || !data.user) {
      // Clear invalid token
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      return { user: null };
    }
    
    return { user: data.user };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { user: null };
  }
};

export const signOut = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    // Clear the token from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    
    return await response.json();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getSessionId = (userId) => {
  if (!userId) return null;
  
  const sessionId = localStorage.getItem(`sessionId_${userId}`);
  if (sessionId) {
    return sessionId;
  }
  
  // Create a new sessionId if one doesn't exist
  const newSessionId = crypto.randomUUID();
  localStorage.setItem(`sessionId_${userId}`, newSessionId);
  return newSessionId;
};

// Get all users with phone numbers for messaging (admin function)
export const getAllUsersWithPhoneNumbers = async () => {
  try {
    // This requires admin access - typically done server-side
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) throw error;
    
    // Filter and map users who have phone numbers
    const usersWithPhones = users
      .filter(user => user.user_metadata?.phone_number)
      .map(user => ({
        id: user.id,
        email: user.email,
        phone_number: user.user_metadata.phone_number,
        created_at: user.created_at
      }));
    
    return usersWithPhones;
  } catch (error) {
    console.error('Error getting users with phone numbers:', error);
    throw error;
  }
};