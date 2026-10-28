const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
export const registerUser = async (userData) => {
    const token = localStorage.getItem('authToken');

    const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    return response.json();
};

export const getUserSettings = async () => {
  const token = localStorage.getItem('authToken');
  
  console.log('Fetching settings for token:');

  const response = await fetch(`${API_URL}/users/settings`, {
      method: 'GET',
      headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
      },
  });

  //console.log('Settings response status:', response.status);

  if (!response.ok) {
      const error = await response.json();
      console.error('Settings fetch error:', error);
      throw new Error(error.error || 'Failed to fetch user settings');
  }

  const data = await response.json();
  //console.log('Settings data:', data);
  return data;
};

export const updateUserSettings = async (settings) => {
    const token = localStorage.getItem('authToken');

    const response = await fetch(`${API_URL}/users/settings`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    return response.json();
};
