import { MemoryService } from './memoryService.js';
import { generateChatResponse } from './geminiService.js';
import { getRandomTherapistPrompt, PROBING_NUDGE_PROBABILITY } from './prompts.js';

export class NudgeService {
  static async generateNudge(userId, sessionId) {
    console.log(`Generating nudge for User: ${userId}, Session: ${sessionId}`);

    try {
      // 1. Get current session context
      const sessionMemory = await MemoryService.getSessionMemory(sessionId);

      // 2. Validate session and context existence
      if (!sessionMemory || !sessionMemory.chat_context || sessionMemory.chat_context.length === 0) {
        console.warn(`Cannot generate nudge: Session ${sessionId} not found or has empty context.`);
        return { response: null };
      }

      // Use the full chat context provided to the generation function later
      const chatContext = sessionMemory.chat_context;

      // 3. Decide Nudge Type (Random Choice)
      const nudgeTypeRoll = Math.random();
      // Require at least one user message and one AI response for a meaningful probing nudge
      const canProbe = chatContext.some(m => m.role === 'user') && chatContext.some(m => m.role === 'assistant');
      const useProbingNudge = nudgeTypeRoll < PROBING_NUDGE_PROBABILITY && canProbe;

      let systemPromptForNudge = "";
      const nudgeUserPrompt = ""; // User prompt is not needed for the nudge itself

      if (useProbingNudge) {
        console.log(`Nudge Type: Probing (Roll: ${nudgeTypeRoll.toFixed(2)})`);

        // Construct the probing system prompt - Instructs AI to analyze the provided history
        systemPromptForNudge = `You are the AI therapist from the ongoing conversation. The user has paused after your last response.
        Your task is to gently re-engage them by asking ONE thoughtful, open-ended, reflective question based on the conversation history provided to you.

        Instructions:
        1. Review the recent flow of the conversation history you received.
        2. Identify a key theme, emotion, event, or point mentioned by the user that seems significant or could benefit from further exploration.
        3. Formulate ONE concise (under 25 words) question related to that identified point.
        4. The question should encourage deeper reflection or elaboration. Avoid simple check-ins like "take your time" or generic "how are you feeling?". Focus on connecting to the *content* of the past exchange.
        5. Maintain your core empathetic, non-judgmental therapist persona: ${getRandomTherapistPrompt()}


        Example Question Styles (adapt based on your analysis of the history):
        - "Reflecting on when you mentioned [topic/feeling from history], what's coming up for you now?"
        - "You talked about [event/person from history] earlier. I'm curious how that thread connects to where we are now?"
        - "What feelings are present for you as you pause here, considering our discussion about [theme from history]?"
        - "Could exploring [specific detail user mentioned in history] further be helpful right now?"

        Ask only the single question. Do not add any preamble like "I noticed you paused...".`; // Added instruction to be direct

      } else {
        console.log(`Nudge Type: Gentle Check-in (Roll: ${nudgeTypeRoll.toFixed(2)}, Can Probe: ${canProbe})`);
        // Use the original gentle check-in prompt
        systemPromptForNudge = `You are the AI therapist from the ongoing conversation. The user has paused for a short while after your last response. Offer a *gentle, brief, and non-pressuring* check-in to re-engage them softly. Avoid making demands or sounding impatient. Examples: "Just checking in, take your time.", "No rush, just wanted to see how you're processing that.", "Any thoughts emerging?", "Is there anything else on your mind regarding that?". Keep it under 20 words. Your persona MUST remain consistent with the main therapist prompt: ${getRandomTherapistPrompt()}
`;
      }

      // 4. Generate the Nudge Response
      console.log(`Generating Nudge Response using ${chatContext.length} context items for Session: ${sessionId}`);
      const nudgeResponseText = await generateChatResponse(
        nudgeUserPrompt, // Empty user prompt
        chatContext, // Provide the FULL current conversation history here
        systemPromptForNudge // Use the dynamically selected system prompt
      );

      // 5. Handle potential empty or failed generation
      if (!nudgeResponseText || nudgeResponseText.trim() === "") {
        console.warn(`Nudge generation resulted in empty response for Session: ${sessionId}`);
        return { response: null }; // Don't save or send an empty nudge
      }

      console.log(`Generated Nudge: ${nudgeResponseText}`);

      // 6. Add the AI's nudge message to the context
      // Ensure chatContext is the array reference from sessionMemory if modifying directly
      sessionMemory.chat_context.push({ // Modify the array within the sessionMemory object
        role: 'assistant',
        content: nudgeResponseText
      });

      // 7. Save updated session memory (including the nudge)
      console.log(`Saving Session Memory after nudge for Session: ${sessionId}`);
      await MemoryService.saveSessionMemory(
        sessionId,
        userId,
        sessionMemory.chat_context // Save the updated context array from the sessionMemory object
      );

      // 8. Return the nudge response to the frontend route handler
      return {
        response: nudgeResponseText,
      };

    } catch (error) {
      console.error('Critical Error Generating Nudge:', error);
      console.error('Error Details:', {
        userId,
        sessionId,
        errorName: error.name,
        errorMessage: error.message,
      });
      throw new Error('Failed to generate nudge message due to an internal server error.');
    }
  }
}