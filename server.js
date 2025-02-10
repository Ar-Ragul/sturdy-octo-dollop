require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { chatWithAI } = require("./services/chatService");
const { executeAgentQuery } = require("./services/agentService");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;


console.log("🔑 OpenAI API Key:", process.env.OPENAI_API_KEY);


app.post("/architect-task", async (req, res) => {
    try {
        const { task } = req.body;
        if (!task) return res.status(400).json({ error: "Task is required" });

        await storeArchitectTask(task);
        res.json({ message: "Task saved successfully" });
    } catch (error) {
        console.error("❌ Error saving task:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Developers fetch latest Architect task
app.get("/architect-task", async (req, res) => {
    try {
        const task = await getLatestArchitectTask();
        res.json({ task });
    } catch (error) {
        console.error("❌ Error fetching task:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Developers submit progress updates
app.post("/developer-update", async (req, res) => {
    try {
        const { update } = req.body;
        if (!update) return res.status(400).json({ error: "Update is required" });

        const response = await executeAgentQuery(update, "Developer");
        res.json({ response });
    } catch (error) {
        console.error("❌ Developer Update Error:", error);
        res.status(500).json({ error: error.message });
    }
});


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

app.post("/agent", async (req, res) => {
    try {
        const { query, role } = req.body;
        if (!query || !role) {
            return res.status(400).json({ error: "Query and role are required" });
        }

        const response = await executeAgentQuery(query, role);
        res.json({ response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
