import { OpenAI } from "openai";
import dotenv, { config } from "dotenv";


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Handles AI chat requests.
 */
async function chatWithAI(prompt) {
    try {
        console.log(`📩 Received prompt: ${prompt}`);

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });

        const aiResponse = response.choices[0].message.content;
        console.log(`🤖 AI Response: ${aiResponse}`);

        return aiResponse;
    } catch (error) {
        console.error("❌ Chat Service Error:", error);
        return "⚠️ Error processing your request.";
    }
}

export{ chatWithAI };
