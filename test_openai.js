require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
    console.log("⏳ Testing OpenAI API...");
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Hello, AI!" }],
        });
        console.log("✅ OpenAI API is working:", response.choices[0].message);
    } catch (error) {
        console.error("❌ OpenAI API Error:", error);
    }
}

testOpenAI();
// This script tests the OpenAI API by sending a sample prompt to the chat model and logging the response.