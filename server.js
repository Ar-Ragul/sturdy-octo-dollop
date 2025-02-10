require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { chatWithAI } = require("./services/chatService");
const { executeAgentQuery } = require("./services/agentService");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// AI Chatbot Endpoint
app.post("/chat", async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: "Prompt is required" });

        const response = await chatWithAI(prompt);
        res.json({ response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI Agent Endpoint (For advanced actions)
app.post("/agent", async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "Query is required" });

        const response = await executeAgentQuery(query);
        res.json({ response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
