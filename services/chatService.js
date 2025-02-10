const { OpenAI } = require("openai");
const chromadb = require("chromadb");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const chroma = new chromadb.ChromaDB();

async function chatWithAI(prompt) {
    // Retrieve chat history
    const history = await chroma.query("chat_memory");

    // Send full conversation to OpenAI for context
    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [...history, { role: "user", content: prompt }],
    });

    const message = response.choices[0].message.content;

    // Store AI response in memory
    await chroma.store("chat_memory", { role: "assistant", content: message });

    return message;
}

module.exports = { chatWithAI };
