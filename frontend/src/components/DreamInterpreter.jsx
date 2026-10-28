import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../hooks/useSession';
import { useToast } from '../hooks/useToast';
import { generateTherapyResponse } from '../services/geminiService';
import LoadingDots from './LoadingDots';
import FloatingLeaf from './FloatingLeaf';
import mountains from '../assets/bg3.jpg';
import Calendar from 'react-calendar'; // You'll need to install this package

const DreamInterpreterChat = ({ user: propUser }) => {
  const { showSuccess, showError } = useToast();
  
  const { 
    sessionId, 
    currentUser, 
    hasInitialized, 
    setHasInitialized
  } = useSession(propUser, showError, showSuccess);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dreamDetails, setDreamDetails] = useState({
    description: '',
    themes: [],
    feelings: '',
    recurring: null,
    lifeEvents: '',
    additionalDetails: '',
    interpretationType: 'Symbolic' // Default to symbolic interpretation
  });
  
  // Dream Journal States
  const [dreamJournal, setDreamJournal] = useState([]);
  const [showJournal, setShowJournal] = useState(false);
  const [selectedDream, setSelectedDream] = useState(null);
  const [journalFilters, setJournalFilters] = useState({
    dateRange: null,
    searchTerm: '',
    themeFilter: '',
    moodFilter: '',
    isRecurring: null
  });
  const [calendarView, setCalendarView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const messagesEndRef = useRef(null);

  // Questions flow
  const questions = [
    "Welcome to Dream Interpreter. I'm here to help you uncover the true meaning behind your dreams. The symbols in your dreams often reflect your subconscious mind. Let's start - could you describe your dream in detail?",
    "Thank you for sharing. Dreams often contain symbolic themes. Which of these themes appeared in your dream? You can select from the options or type your own.",
    "How did you feel during the dream? Emotions are powerful keys to understanding dream meanings.",
    "Interesting. Have you seen this dream more than once? Recurring dreams often highlight important unresolved issues.",
    "Was there anything recently in your life that might be related to this dream? Even small events can trigger symbolic dreams.",
    "Is there anything else you'd like to share about this dream or how it affected you?",
    "Thank you for all these details. I'll now analyze your dream through a symbolic lens to uncover its deeper meaning..."
  ];

  // Theme options for step 2
  const themeOptions = [
    "Flying", "Falling", "Being chased", "Being unprepared", 
    "Meeting someone", "Losing something", "Finding something", 
    "Water or ocean", "Strange location", "Familiar faces"
  ];

  // Feeling options for step 3
  const feelingOptions = [
    "Happy", "Scared", "Anxious", "Peaceful", 
    "Confused", "Excited", "Sad", "Angry"
  ];

  // Load dream journal from local storage on component mount
  useEffect(() => {
    const loadDreamJournal = () => {
      try {
        const savedJournal = localStorage.getItem(`dreamJournal_${currentUser?.id}`);
        if (savedJournal) {
          setDreamJournal(JSON.parse(savedJournal));
        }
      } catch (error) {
        console.error('Error loading dream journal:', error);
        showError("Could not load your dream journal");
      }
    };
    
    if (currentUser?.id) {
      loadDreamJournal();
    }
  }, [currentUser]);

  // Modify the useEffect hook to prevent duplicate welcome messages
  useEffect(() => {
    if (sessionId && currentUser && !messages.length && !hasInitialized) {
      addBotMessage(questions[0]);
      setHasInitialized(true); // Mark as initialized to prevent duplicate messages
    }
  }, [sessionId, currentUser, messages.length, hasInitialized, setHasInitialized]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Save dream journal to local storage
  const saveDreamJournal = (updatedJournal) => {
    try {
      localStorage.setItem(`dreamJournal_${currentUser?.id}`, JSON.stringify(updatedJournal));
    } catch (error) {
      console.error('Error saving dream journal:', error);
      showError("Could not save to your dream journal");
    }
  };

  const addBotMessage = (text, delay = 500) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text,
        timestamp: new Date().toISOString()
      }]);
      setIsTyping(false);
    }, delay);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, {
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleSend = async (text = input) => {
    const userInput = text.trim();
    if (!userInput) return;
    
    setInput('');
    addUserMessage(userInput);
    
    // Process user input based on current step
    processUserInput(userInput);
  };

  const processUserInput = async (userInput) => {
    switch (currentStep) {
      case 0: // Dream description
        setDreamDetails(prev => ({ ...prev, description: userInput }));
        setCurrentStep(1);
        addBotMessage(questions[1]);
        break;
      
      case 1: // Dream themes
        // Allow user to type their own themes
        const userThemes = userInput.split(',').map(theme => theme.trim());
        setDreamDetails(prev => ({ 
          ...prev, 
          themes: [...(prev.themes || []), ...userThemes] 
        }));
        setCurrentStep(2);
        addBotMessage(questions[2]);
        break;
      
      case 2: // Feelings
        setDreamDetails(prev => ({ ...prev, feelings: userInput }));
        setCurrentStep(3);
        addBotMessage(questions[3]);
        break;
      
      case 3: // Recurring
        setDreamDetails(prev => ({ ...prev, recurring: userInput.toLowerCase().includes('yes') }));
        setCurrentStep(4);
        addBotMessage(questions[4]);
        break;
      
      case 4: // Life events
        setDreamDetails(prev => ({ ...prev, lifeEvents: userInput }));
        setCurrentStep(5);
        addBotMessage(questions[5]);
        break;
      
      case 5: // Additional details
        setDreamDetails(prev => ({ ...prev, additionalDetails: userInput }));
        setCurrentStep(6);
        addBotMessage(questions[6]);
        generateInterpretation();
        break;
      
      case 7: // After interpretation - continue conversation
        // Send the new user query plus all dream details for context
        generateFollowUpResponse(userInput);
        break;
    }
  };

  const handleThemeSelection = (theme) => {
    // Toggle theme selection
    let newThemes = [...dreamDetails.themes];
    
    if (newThemes.includes(theme)) {
      newThemes = newThemes.filter(t => t !== theme);
    } else {
      newThemes.push(theme);
    }
    
    setDreamDetails(prev => ({ ...prev, themes: newThemes }));
  };

  const confirmThemeSelection = () => {
    if (dreamDetails.themes.length === 0) {
      // If no themes selected, let user type their own
      return;
    }
    
    addUserMessage(dreamDetails.themes.join(', '));
    setCurrentStep(2);
    addBotMessage(questions[2]);
  };

  const selectFeelingOption = (feeling) => {
    setDreamDetails(prev => ({ ...prev, feelings: feeling }));
    addUserMessage(feeling);
    setCurrentStep(3);
    addBotMessage(questions[3]);
  };

  const selectYesNo = (answer) => {
    setDreamDetails(prev => ({ ...prev, recurring: answer === 'Yes' }));
    addUserMessage(answer);
    setCurrentStep(4);
    addBotMessage(questions[4]);
  };

  const generateInterpretation = async () => {
    setIsTyping(true);
    try {
      // Build a detailed prompt for the API
      const prompt = `
Please interpret this dream with a symbolic approach:
Dream description: ${dreamDetails.description}
Themes: ${dreamDetails.themes.join(', ')}
Feelings during dream: ${dreamDetails.feelings}
Recurring dream: ${dreamDetails.recurring ? 'Yes' : 'No'}
Related life events: ${dreamDetails.lifeEvents || 'None specified'}
Additional details: ${dreamDetails.additionalDetails || 'None provided'}

Provide a symbolic interpretation that explores the deeper meaning of these dream elements. Include what each symbol might represent in the dreamer's life, potential messages from their subconscious, and how this dream might relate to their current life situation.
`;

      const response = await generateTherapyResponse(prompt, 'dream');
      
      // Add interpretation as a bot message
      setTimeout(() => {
        addBotMessage(response);
        
        // Save the dream to journal
        const newDreamEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          dreamDetails: { ...dreamDetails },
          interpretation: response,
          conversationHistory: [...messages, { 
            sender: 'ai', 
            text: response, 
            timestamp: new Date().toISOString() 
          }],
          tags: []
        };
        
        const updatedJournal = [...dreamJournal, newDreamEntry];
        setDreamJournal(updatedJournal);
        saveDreamJournal(updatedJournal);
        
        // Notify user that the dream was saved
        setTimeout(() => {
          addBotMessage("I've saved this dream interpretation to your journal. You can access it anytime from your Dream Journal. How does this interpretation resonate with you? Is there anything specific that stands out or any questions you have about the symbolism?");
          setCurrentStep(7); // Move to conversation continuation step
        }, 1000);
      }, 1000);
    } catch (error) {
      console.error('Error interpreting dream:', error);
      addBotMessage("I'm sorry, I had trouble interpreting your dream. Would you like to try again?");
      showError("Error interpreting dream");
    } finally {
      setIsTyping(false);
    }
  };

  const generateFollowUpResponse = async (userQuery) => {
    setIsTyping(true);
    try {
      // Include all dream context plus the new query
      const prompt = `
Context: We were discussing this dream:
Dream description: ${dreamDetails.description}
Themes: ${dreamDetails.themes.join(', ')}
Feelings: ${dreamDetails.feelings}
Recurring: ${dreamDetails.recurring ? 'Yes' : 'No'}
Related life events: ${dreamDetails.lifeEvents}
Additional details: ${dreamDetails.additionalDetails}

The person has responded to the symbolic interpretation with: "${userQuery}"

Please provide a thoughtful response that addresses their query/comment while maintaining the role of a dream interpreter. Continue to use a symbolic approach to dream analysis.
`;

      const response = await generateTherapyResponse(prompt, 'dream');
      
      // Add response as a bot message
      setTimeout(() => {
        addBotMessage(response);
        
        // Update the conversation history in the dream journal
        if (dreamJournal.length > 0) {
          const updatedJournal = dreamJournal.map(dream => {
            if (dream.date === new Date().toDateString()) {
              return {
                ...dream,
                conversationHistory: [
                  ...dream.conversationHistory,
                  { sender: 'user', text: userQuery, timestamp: new Date().toISOString() },
                  { sender: 'ai', text: response, timestamp: new Date().toISOString() }
                ]
              };
            }
            return dream;
          });
          
          setDreamJournal(updatedJournal);
          saveDreamJournal(updatedJournal);
        }
      }, 1000);
    } catch (error) {
      console.error('Error generating follow-up response:', error);
      addBotMessage("I'm sorry, I had trouble processing your response. Could you please rephrase your question?");
      showError("Error generating response");
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Dream Journal Functions
  const toggleJournalView = () => {
    setShowJournal(!showJournal);
    setCalendarView(false);
    setSelectedDream(null);
  };

  const toggleCalendarView = () => {
    setCalendarView(!calendarView);
    if (!calendarView) {
      setSelectedDream(null);
    }
  };

  const viewDreamDetails = (dreamId) => {
    const dream = dreamJournal.find(d => d.id === dreamId);
    setSelectedDream(dream);
  };

  const deleteDreamEntry = (dreamId) => {
    const updatedJournal = dreamJournal.filter(dream => dream.id !== dreamId);
    setDreamJournal(updatedJournal);
    saveDreamJournal(updatedJournal);
    setSelectedDream(null);
    showSuccess("Dream deleted from journal");
  };

  const addTagToDream = (dreamId, tag) => {
    const updatedJournal = dreamJournal.map(dream => {
      if (dream.id === dreamId && !dream.tags.includes(tag)) {
        return {
          ...dream,
          tags: [...dream.tags, tag]
        };
      }
      return dream;
    });
    
    setDreamJournal(updatedJournal);
    saveDreamJournal(updatedJournal);
    
    // Update selected dream if it's the one being modified
    if (selectedDream && selectedDream.id === dreamId) {
      setSelectedDream(updatedJournal.find(d => d.id === dreamId));
    }
  };

  const removeTagFromDream = (dreamId, tagToRemove) => {
    const updatedJournal = dreamJournal.map(dream => {
      if (dream.id === dreamId) {
        return {
          ...dream,
          tags: dream.tags.filter(tag => tag !== tagToRemove)
        };
      }
      return dream;
    });
    
    setDreamJournal(updatedJournal);
    saveDreamJournal(updatedJournal);
    
    // Update selected dream if it's the one being modified
    if (selectedDream && selectedDream.id === dreamId) {
      setSelectedDream(updatedJournal.find(d => d.id === dreamId));
    }
  };

  const handleFilterChange = (field, value) => {
    setJournalFilters(prev => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setJournalFilters({
      dateRange: null,
      searchTerm: '',
      themeFilter: '',
      moodFilter: '',
      isRecurring: null
    });
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    // Find dreams from this date
    const dreamsOnDate = dreamJournal.filter(dream => 
      new Date(dream.date).toDateString() === date.toDateString()
    );
    
    if (dreamsOnDate.length === 1) {
      setSelectedDream(dreamsOnDate[0]);
    } else if (dreamsOnDate.length > 1) {
      // Show a list of dreams from this date
      setShowJournal(true);
      setCalendarView(false);
      handleFilterChange('dateRange', { 
        start: date, 
        end: new Date(date.getTime() + 24*60*60*1000) 
      });
    }
  };

  // Filter dreams based on current filters
  const getFilteredDreams = () => {
    return dreamJournal.filter(dream => {
      // Date range filter
      if (journalFilters.dateRange) {
        const dreamDate = new Date(dream.date);
        if (dreamDate < journalFilters.dateRange.start || dreamDate > journalFilters.dateRange.end) {
          return false;
        }
      }
      
      // Search term filter
      if (journalFilters.searchTerm) {
        const searchLower = journalFilters.searchTerm.toLowerCase();
        const dreamTextLower = dream.dreamDetails.description.toLowerCase();
        const themesText = dream.dreamDetails.themes.join(' ').toLowerCase();
        
        if (!dreamTextLower.includes(searchLower) && 
            !themesText.includes(searchLower) && 
            !dream.interpretation.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Theme filter
      if (journalFilters.themeFilter && 
          !dream.dreamDetails.themes.some(theme => 
            theme.toLowerCase().includes(journalFilters.themeFilter.toLowerCase())
          )) {
        return false;
      }
      
      // Mood filter
      if (journalFilters.moodFilter && 
          !dream.dreamDetails.feelings.toLowerCase().includes(journalFilters.moodFilter.toLowerCase())) {
        return false;
      }
      
      // Recurring filter
      if (journalFilters.isRecurring !== null && 
          dream.dreamDetails.recurring !== journalFilters.isRecurring) {
        return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first
  };

  // Get all unique themes from dreams
  const getAllUniqueThemes = () => {
    const allThemes = new Set();
    dreamJournal.forEach(dream => {
      dream.dreamDetails.themes.forEach(theme => {
        allThemes.add(theme);
      });
    });
    return Array.from(allThemes).sort();
  };

  // Get all unique moods/feelings from dreams
  const getAllUniqueMoods = () => {
    const allMoods = new Set();
    dreamJournal.forEach(dream => {
      if (dream.dreamDetails.feelings) {
        dream.dreamDetails.feelings.split(',').forEach(mood => {
          allMoods.add(mood.trim());
        });
      }
    });
    return Array.from(allMoods).sort();
  };

  // Calculate dream stats
  const getDreamStats = () => {
    if (dreamJournal.length === 0) {
      return { total: 0, recurring: 0, mostCommonTheme: 'None', mostCommonMood: 'None' };
    }
    
    // Count recurring dreams
    const recurring = dreamJournal.filter(dream => dream.dreamDetails.recurring).length;
    
    // Count theme frequencies
    const themeCount = {};
    dreamJournal.forEach(dream => {
      dream.dreamDetails.themes.forEach(theme => {
        themeCount[theme] = (themeCount[theme] || 0) + 1;
      });
    });
    
    // Count mood frequencies
    const moodCount = {};
    dreamJournal.forEach(dream => {
      if (dream.dreamDetails.feelings) {
        const moods = dream.dreamDetails.feelings.split(',');
        moods.forEach(mood => {
          const trimmedMood = mood.trim();
          moodCount[trimmedMood] = (moodCount[trimmedMood] || 0) + 1;
        });
      }
    });
    
    // Find most common theme
    let mostCommonTheme = 'None';
    let maxThemeCount = 0;
    for (const theme in themeCount) {
      if (themeCount[theme] > maxThemeCount) {
        maxThemeCount = themeCount[theme];
        mostCommonTheme = theme;
      }
    }
    
    // Find most common mood
    let mostCommonMood = 'None';
    let maxMoodCount = 0;
    for (const mood in moodCount) {
      if (moodCount[mood] > maxMoodCount) {
        maxMoodCount = moodCount[mood];
        mostCommonMood = mood;
      }
    }
    
    return {
      total: dreamJournal.length,
      recurring,
      mostCommonTheme,
      mostCommonMood
    };
  };

  // Start a new dream interpretation
  const startNewDreamInterpretation = () => {
    setMessages([]);
    setDreamDetails({
      description: '',
      themes: [],
      feelings: '',
      recurring: null,
      lifeEvents: '',
      additionalDetails: '',
      interpretationType: 'Symbolic'
    });
    setCurrentStep(0);
    setShowJournal(false);
    setSelectedDream(null);
    setHasInitialized(false);
  };

  // Render quick response buttons based on current step
  const renderResponseButtons = () => {
    switch (currentStep) {
      case 1: // Theme selection with option to type custom themes
        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1">
              {themeOptions.map((theme) => (
                <button
                  key={theme}
                  onClick={() => handleThemeSelection(theme)}
                  className={`px-2 py-1 rounded-full transition-all text-xs ${
                    dreamDetails.themes.includes(theme)
                      ? 'bg-purple-300/70 text-gray-800'
                      : 'bg-white/40 text-gray-700 hover:bg-white/50'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
            <button
              onClick={confirmThemeSelection}
              className="px-2 py-1 rounded-full bg-white/60 text-gray-700 hover:bg-white/70 transition-all text-xs font-medium"
            >
              Continue with Selected
            </button>
            <p className="text-center text-xs text-gray-600">Or type your own themes</p>
          </div>
        );
      
      case 2: // Feeling selection with option to type own feelings
        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1 justify-center">
              {feelingOptions.map((feeling) => (
                <button
                  key={feeling}
                  onClick={() => selectFeelingOption(feeling)}
                  className="px-2 py-1 rounded-full bg-white/40 text-gray-700 hover:bg-white/50 transition-all text-xs"
                >
                  {feeling}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-600">Or type your own feelings</p>
          </div>
        );
      
      case 3: // Yes/No for recurring
        return (
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => selectYesNo('Yes')}
              className="px-4 py-1 rounded-full bg-white/40 text-gray-700 hover:bg-white/50 transition-all text-xs"
            >
              Yes
            </button>
            <button
              onClick={() => selectYesNo('No')}
              className="px-4 py-1 rounded-full bg-white/40 text-gray-700 hover:bg-white/50 transition-all text-xs"
            >
              No
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Render tiled dream entries
  const renderDreamEntries = () => {
    const filteredDreams = getFilteredDreams();
    
    if (filteredDreams.length === 0) {
      return (
        <div className="p-4 text-center text-gray-600">
          <p>No dreams found matching your filters.</p>
          <button
            onClick={resetFilters}
            className="mt-2 px-4 py-1 bg-purple-200/50 rounded-full text-xs hover:bg-purple-200/70 transition-all"
          >
            Reset Filters
          </button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
        {filteredDreams.map(dream => (
          <div
            key={dream.id}
            onClick={() => viewDreamDetails(dream.id)}
            className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-sm cursor-pointer hover:bg-white/30 transition-all"
          >
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-medium text-sm text-gray-700 truncate">
                {dream.dreamDetails.description.substring(0, 30)}...
              </h4>
              <span className="text-xs text-gray-500">
                {new Date(dream.date).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {dream.dreamDetails.themes.slice(0, 3).map((theme, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-white/30 rounded-full text-xs text-gray-600">
                  {theme}
                </span>
              ))}
              {dream.dreamDetails.themes.length > 3 && (
                <span className="px-2 py-0.5 bg-white/30 rounded-full text-xs text-gray-600">
                  +{dream.dreamDetails.themes.length - 3}
                </span>
              )}
            </div>
            
            <div className="flex items-center text-xs text-gray-600">
              <span className={`w-2 h-2 rounded-full mr-1 ${
                dream.dreamDetails.feelings.toLowerCase().includes('happy') || 
                dream.dreamDetails.feelings.toLowerCase().includes('peaceful') || 
                dream.dreamDetails.feelings.toLowerCase().includes('excited')
                  ? 'bg-green-400'
                  : dream.dreamDetails.feelings.toLowerCase().includes('scared') || 
                    dream.dreamDetails.feelings.toLowerCase().includes('anxious') ||
                    dream.dreamDetails.feelings.toLowerCase().includes('confused')
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
              }`}></span>
              {dream.dreamDetails.feelings.split(',')[0]}
              
              {dream.dreamDetails.recurring && (
                <span className="ml-auto flex items-center">
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M17 2l4 4-4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 11v-1a4 4 0 014-4h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 22l-4-4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 13v1a4 4 0 01-4 4H3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Recurring
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render dream detail view
  const renderDreamDetail = () => {
    if (!selectedDream) return null;
    
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between bg-white/30 p-2 border-b border-white/20">
          <button
            onClick={() => setSelectedDream(null)}
            className="flex items-center text-xs text-gray-600 hover:text-gray-800 transition-all"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Journal
          </button>
          
          <span className="text-sm font-medium">
            {new Date(selectedDream.date).toLocaleDateString()}
          </span>
          
          <button
            onClick={() => deleteDreamEntry(selectedDream.id)}
            className="text-red-500 hover:text-red-700 text-xs transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
        <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-4">
              <h3 className="text-base font-medium text-gray-700 mb-1">Dream Description</h3>
              <div className="bg-white/20 rounded-lg p-3 text-sm text-gray-700">
                {selectedDream.dreamDetails.description}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Themes</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedDream.dreamDetails.themes.map((theme, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full bg-white/30 text-xs text-gray-600">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Feelings</h4>
                <div className="bg-white/20 rounded-lg p-2 text-sm text-gray-700">
                  {selectedDream.dreamDetails.feelings}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Recurring</h4>
                <div className="bg-white/20 rounded-lg p-2 text-sm text-gray-700">
                  {selectedDream.dreamDetails.recurring ? 'Yes' : 'No'}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Life Events</h4>
                <div className="bg-white/20 rounded-lg p-2 text-sm text-gray-700">
                  {selectedDream.dreamDetails.lifeEvents || 'None specified'}
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-base font-medium text-gray-700 mb-1">Interpretation</h3>
              <div className="bg-white/20 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {selectedDream.interpretation}
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Tags</h4>
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedDream.tags.map((tag, idx) => (
                  <div key={idx} className="flex items-center px-2 py-0.5 bg-purple-100/50 rounded-full text-xs text-gray-600">
                    {tag}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTagFromDream(selectedDream.id, tag);
                      }}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Add a tag..."
                  className="text-xs px-2 py-1 bg-white/30 rounded-lg flex-1 text-gray-600 focus:outline-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      addTagToDream(selectedDream.id, e.target.value.trim());
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-base font-medium text-gray-700 mb-1">Conversation History</h3>
              <div className="bg-white/20 rounded-lg p-2 max-h-64 overflow-y-auto">
                {selectedDream.conversationHistory.map((message, idx) => (
                  <div 
                    key={idx} 
                    className={`mb-2 p-2 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-white/40 ml-8' 
                        : 'bg-purple-100/30 mr-8'
                    }`}
                  >
                    <p className="text-xs text-gray-700">{message.text}</p>
                    <div className="text-right text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render journal filters
  const renderJournalFilters = () => {
    const uniqueThemes = getAllUniqueThemes();
    const uniqueMoods = getAllUniqueMoods();
    
    return (
      <div className="bg-white/30 p-2 border-b border-white/20">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search dreams..."
              value={journalFilters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="px-2 py-1 text-xs bg-white/30 rounded-lg text-gray-600 focus:outline-none w-36"
            />
          </div>
          
          <select
            value={journalFilters.themeFilter}
            onChange={(e) => handleFilterChange('themeFilter', e.target.value)}
            className="px-2 py-1 text-xs bg-white/30 rounded-lg text-gray-600 focus:outline-none"
          >
            <option value="">All Themes</option>
            {uniqueThemes.map((theme, idx) => (
              <option key={idx} value={theme}>{theme}</option>
            ))}
          </select>
          
          <select
            value={journalFilters.moodFilter}
            onChange={(e) => handleFilterChange('moodFilter', e.target.value)}
            className="px-2 py-1 text-xs bg-white/30 rounded-lg text-gray-600 focus:outline-none"
          >
            <option value="">All Moods</option>
            {uniqueMoods.map((mood, idx) => (
              <option key={idx} value={mood}>{mood}</option>
            ))}
          </select>
          
          <select
            value={journalFilters.isRecurring === null ? '' : journalFilters.isRecurring.toString()}
            onChange={(e) => {
              const value = e.target.value;
              handleFilterChange('isRecurring', value === '' ? null : value === 'true');
            }}
            className="px-2 py-1 text-xs bg-white/30 rounded-lg text-gray-600 focus:outline-none"
          >
            <option value="">All Dreams</option>
            <option value="true">Recurring Only</option>
            <option value="false">Non-Recurring Only</option>
          </select>
          
          <button
            onClick={resetFilters}
            className="px-2 py-1 text-xs bg-white/30 rounded-lg text-gray-600 hover:bg-white/40 transition-all"
          >
            Clear Filters
          </button>
        </div>
      </div>
    );
  };

  // Render calendar view
  const renderCalendarView = () => {
    // Create data for calendar that shows which dates have dreams
    const dreamDates = dreamJournal.reduce((acc, dream) => {
      const dateStr = new Date(dream.date).toDateString();
      acc[dateStr] = (acc[dateStr] || 0) + 1;
      return acc;
    }, {});
    
    // Function to add content to calendar tiles
    const tileContent = ({ date, view }) => {
      if (view === 'month') {
        const dateStr = date.toDateString();
        if (dateStr in dreamDates) {
          return (
            <div className="flex justify-center items-center">
              <div className="w-1 h-1 bg-purple-500 rounded-full mt-1"></div>
            </div>
          );
        }
      }
      return null;
    };
    
    return (
      <div className="p-3">
        <div className="bg-white/20 rounded-xl p-3">
          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
            tileContent={tileContent}
            className="border-0 shadow-none bg-transparent"
          />
        </div>
        
        <div className="mt-3 text-center text-xs text-gray-600">
          <p>Select a date to view associated dreams</p>
        </div>
      </div>
    );
  };

  // Render dream journal stats
  const renderDreamStats = () => {
    const stats = getDreamStats();
    
    return (
      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="bg-white/20 rounded-xl p-3 flex flex-col items-center justify-center">
          <div className="text-2xl font-semibold text-purple-500">{stats.total}</div>
          <div className="text-xs text-gray-600">Total Dreams</div>
        </div>
        
        <div className="bg-white/20 rounded-xl p-3 flex flex-col items-center justify-center">
          <div className="text-2xl font-semibold text-purple-500">
            {stats.recurring} 
            <span className="text-xs text-gray-600">
              ({stats.total ? Math.round((stats.recurring / stats.total) * 100) : 0}%)
            </span>
          </div>
          <div className="text-xs text-gray-600">Recurring Dreams</div>
        </div>
        
        <div className="bg-white/20 rounded-xl p-3 flex flex-col items-center justify-center">
          <div className="text-sm font-semibold text-purple-500 truncate max-w-full">
            {stats.mostCommonTheme}
          </div>
          <div className="text-xs text-gray-600">Most Common Theme</div>
        </div>
        
        <div className="bg-white/20 rounded-xl p-3 flex flex-col items-center justify-center">
          <div className="text-sm font-semibold text-purple-500 truncate max-w-full">
            {stats.mostCommonMood}
          </div>
          <div className="text-xs text-gray-600">Most Common Feeling</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-cover bg-center overflow-hidden" 
         style={{ backgroundImage: `url(${mountains})` }}>
      <FloatingLeaf className="text-purple-400/40" />
      <FloatingLeaf className="text-purple-500/40" />
      <FloatingLeaf className="text-purple-600/40" />
      
      {/* Main Container - Perfectly Centered */}
      <div className="flex flex-row w-full max-w-7xl h-[75vh] rounded-xl shadow-2xl overflow-hidden mx-4">
        {/* Left Section - Static */}
        <div className="w-64 md:w-72 bg-white/10 backdrop-blur-lg border-r border-white/10 flex-shrink-0">
          <div className="h-full flex flex-col p-2 md:p-3">
            {/* Logo and Title */}
            <div className="flex flex-col items-center mb-3">
              <div className="w-8 h-8 mb-1">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L4 15h16L12 3z" stroke="currentColor" strokeWidth="2" className="text-purple-600"/>
                  <circle cx="12" cy="12" r="4" fill="currentColor" className="text-purple-600"/>
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-700">Dream Interpreter</h3>
            </div>

            {/* Navigation Options */}
            <div className="space-y-1 mb-3">
              <button
                onClick={startNewDreamInterpretation}
                className="w-full text-left px-3 py-2 rounded-lg bg-white/20 text-gray-700 text-sm hover:bg-white/30 transition-all"
              >
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  New Dream Interpretation
                </div>
              </button>
              
              <button
                onClick={toggleJournalView}
                className={`w-full text-left px-3 py-2 rounded-lg ${
                  showJournal ? 'bg-white/30' : 'bg-white/10'
                } text-gray-700 text-sm hover:bg-white/30 transition-all`}
              >
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                  Dream Journal
                  {dreamJournal.length > 0 && (
                    <span className="ml-auto bg-purple-200 text-purple-800 rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {dreamJournal.length}
                    </span>
                  )}
                </div>
              </button>
              
              <button
                onClick={toggleCalendarView}
                className={`w-full text-left px-3 py-2 rounded-lg ${
                  calendarView ? 'bg-white/30' : 'bg-white/10'
                } text-gray-700 text-sm hover:bg-white/30 transition-all`}
              >
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Calendar View
                </div>
              </button>
            </div>

            {!showJournal && !calendarView && (
              <>
                {/* Dream Progress */}
                <div className="bg-white/10 rounded-xl p-2 mb-3">
                  <h4 className="text-xs font-medium text-gray-600 mb-1">Dream Journey Progress</h4>
                  <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all" 
                      style={{ width: `${Math.min((currentStep / 6) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-700">
                    {currentStep < 6 ? "Revealing your dream's symbols..." : 
                     currentStep === 6 ? "Decoding symbolic meanings..." : 
                     "Symbols decoded - continue exploring"}
                  </p>
                </div>

                {/* Dream Wisdom */}
                <div className="bg-white/10 rounded-xl p-2 mb-3">
                  <h4 className="text-xs font-medium text-gray-600 mb-1">Dream Wisdom</h4>
                  <p className="text-xs text-gray-700 italic">
                    "Dreams are the royal road to the unconscious." - Sigmund Freud
                  </p>
                </div>

                {/* Common Dream Symbols */}
                <div className="flex-grow overflow-y-auto">
                  <h4 className="text-xs font-medium text-gray-600 mb-1">COMMON DREAM SYMBOLS</h4>
                  <div className="space-y-1">
                    {[
                      'Water: Emotions & unconscious',
                      'Flying: Freedom & perspective',
                      'Falling: Loss of control',
                      'Teeth: Communication & power',
                      'Doors: Opportunities & transitions'
                    ].map((symbol, index) => (
                      <div
                        key={index}
                        className="w-full text-left px-2 py-1 rounded-lg bg-white/10 text-gray-600 text-xs"
                      >
                        {symbol}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dream Tips */}
                <div className="mt-auto py-2">
                  <div className="text-xs text-gray-600 bg-white/10 rounded-lg p-2">
                    <span className="font-medium">Dream Tip:</span> Keep a dream journal by your bed to record dreams as soon as you wake, when they're freshest in your mind.
                  </div>
                </div>
              </>
            )}
            
            {(showJournal || calendarView) && dreamJournal.length > 0 && (
              <div className="flex-grow flex flex-col">
                <div className="bg-white/10 rounded-xl p-2 mb-3">
                  <h4 className="text-xs font-medium text-gray-600 mb-1">Dream Journal Stats</h4>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600">Total Dreams:</span>
                      <span className="text-xs font-medium text-gray-700">{dreamJournal.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600">Recurring Dreams:</span>
                      <span className="text-xs font-medium text-gray-700">
                        {dreamJournal.filter(d => d.dreamDetails.recurring).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600">This Month:</span>
                      <span className="text-xs font-medium text-gray-700">
                        {dreamJournal.filter(d => {
                          const date = new Date(d.date);
                          const now = new Date();
                          return date.getMonth() === now.getMonth() && 
                                 date.getFullYear() === now.getFullYear();
                        }).length}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-xl p-2 mb-3 flex-1">
                  <h4 className="text-xs font-medium text-gray-600 mb-1">Recent Themes</h4>
                  <div className="flex flex-wrap gap-1">
                    {getAllUniqueThemes().slice(0, 8).map((theme, idx) => (
                      <span 
                        key={idx} 
                        className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-gray-600 cursor-pointer hover:bg-white/30 transition-all"
                        onClick={() => {
                          setShowJournal(true);
                          setCalendarView(false);
                          handleFilterChange('themeFilter', theme);
                        }}
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Content Section - Scrollable */}
        <div className="flex-1 flex flex-col backdrop-blur-sm min-w-0">
          {/* Headers */}
          {!showJournal && !calendarView && (
            <div className="bg-white/20 p-2 border-b border-white/20 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-700">Symbolic Dream Analysis</h2>
              {dreamJournal.length > 0 && (
                <button
                  onClick={toggleJournalView}
                  className="text-xs text-purple-600 hover:text-purple-800 transition-all"
                >
                  View Dream Journal ({dreamJournal.length})
                </button>
              )}
            </div>
          )}
          
          {showJournal && !selectedDream && (
            <div className="bg-white/20 p-2 border-b border-white/20 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-700">Dream Journal</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleCalendarView}
                  className="text-xs text-purple-600 hover:text-purple-800 transition-all"
                >
                  Calendar View
                </button>
                <button
                  onClick={startNewDreamInterpretation}
                  className="text-xs text-gray-600 hover:text-gray-800 transition-all"
                >
                  New Dream
                </button>
              </div>
            </div>
          )}
          
          {calendarView && (
            <div className="bg-white/20 p-2 border-b border-white/20 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-700">Dream Calendar</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleJournalView}
                  className="text-xs text-purple-600 hover:text-purple-800 transition-all"
                >
                  List View
                </button>
                <button
                  onClick={startNewDreamInterpretation}
                  className="text-xs text-gray-600 hover:text-gray-800 transition-all"
                >
                  New Dream
                </button>
              </div>
            </div>
          )}
          
          {/* Dream Chat Section */}
          {!showJournal && !calendarView && (
            <>
              {/* Messages Area - Scrollable */}
              <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2">
                {messages.map((message, index) => (
                  <div
                    key={`${message.sender}-${message.timestamp}-${index}`}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-2 ${
                        message.sender === 'user'
                          ? 'bg-white/60 ml-4'
                          : 'bg-purple-100/40 mr-4'
                      }`}
                    >
                      <p className="text-gray-700 whitespace-pre-wrap text-sm">{message.text}</p>
                      <span className="text-xs text-gray-500 mt-1 block text-right">
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-purple-100/40 rounded-2xl p-2">
                      <LoadingDots />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Response Buttons */}
              <div className="bg-white/20 px-2 py-1 flex gap-1 justify-center flex-wrap">
                {renderResponseButtons()}
              </div>

              {/* Input Area - Show for free text input and after interpretation */}
              <div className="p-2 bg-white/20">
                <div className="flex gap-2">
                  {(currentStep === 0 || currentStep === 1 || currentStep === 2 || currentStep === 4 || currentStep === 5 || currentStep === 7) && (
                    <>
                      <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSend()}
                        placeholder={
                          currentStep === 0 ? "Describe your dream in detail..." : 
                          currentStep === 1 ? "Type dream themes or select above..." :
                          currentStep === 2 ? "How did you feel during the dream?" :
                          currentStep === 4 ? "Share recent life events..." :
                          currentStep === 5 ? "Any additional details about your dream..." :
                          "Ask about your dream interpretation..."
                        }
                        className="flex-1 px-3 py-1 rounded-full bg-white/50 placeholder-gray-500 text-gray-700 focus:outline-none focus:ring-1 focus:ring-white/50 text-sm"
                        disabled={!currentUser || !sessionId || isTyping}
                      />
                      <button
                        onClick={() => handleSend()}
                        disabled={isTyping || !currentUser || !sessionId || !input.trim()}
                        className="p-1 rounded-full bg-white/50 text-gray-700 hover:bg-white/60 transition-all disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Dream Journal Section */}
          {showJournal && !calendarView && (
            <>
              {/* Journal Filters */}
              {!selectedDream && renderJournalFilters()}
              
              {/* Journal Content */}
              <div className="flex-1 overflow-y-auto">
                {selectedDream ? renderDreamDetail() : (
                  <>
                    {dreamJournal.length > 0 ? (
                      <>
                        {renderDreamStats()}
                        {renderDreamEntries()}
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-16 h-16 mb-4 text-purple-300/50">
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">Your Dream Journal is Empty</h3>
                        <p className="text-sm text-gray-600 mb-4 max-w-md">
                          Start by interpreting a dream. Once completed, it will be automatically saved to your journal for future reference.
                        </p>
                        <button
                          onClick={startNewDreamInterpretation}
                          className="px-4 py-2 bg-purple-500/70 text-white rounded-lg text-sm hover:bg-purple-600/70 transition-all"
                        >
                          Interpret Your First Dream
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
          
          {/* Calendar View */}
          {calendarView && (
            <div className="flex-1 overflow-y-auto">
              {renderCalendarView()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DreamInterpreterChat;