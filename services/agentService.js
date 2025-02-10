import axios from "axios";

const API_URL = "http://localhost:3000";  // Backend URL

export async function sendMessageToAI(prompt: string) {
  try {
    const response = await axios.post(`${API_URL}/chat`, { prompt });
    return response.data.response;
  } catch (error) {
    console.error("Error communicating with AI:", error);
    return "⚠️ Error: Could not connect to AI.";
  }
}

export async function executeAgentQuery(query: string) {
  try {
    const response = await axios.post(`${API_URL}/agent`, { query });
    return response.data.response;
  } catch (error) {
    console.error("Error executing AI agent:", error);
    return "⚠️ Error: AI agent failed to process.";
  }
}
