import dotenv from "dotenv";
import express from "express";
import cors from "cors";
// import {storeArchitectTask, getLatestArchitectTask} from "./services/agentService.js";
import { createAssistant, executeAITask, createAI_Agent, listAgents } from './services/agentService.js'; 
import {chatWithAI} from "./services/chatService.js";


dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
let assistantId = null;


console.log("🔑 OpenAI API Key:", process.env.OPENAI_API_KEY);




app.get("/agents", async (req, res) => {
    try {
        const agents = await listAgents();
        res.json({ agents });
    } catch (error) {
        console.error("❌ Error fetching agents:", error);
        res.status(500).json({ error: "Failed to fetch agents." });
    }
});

// ✅ Route to create an agent (optional)
app.post("/agents", async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ error: "Role is required." });
        }
        const agent = await createAI_Agent(role);
        res.json({ message: "Agent created", agentId: agent.id });
    } catch (error) {
        console.error("❌ Error creating agent:", error);
        res.status(500).json({ error: "Failed to create agent." });
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


(async () => {
    try {
        assistantId = await createAssistant();
        console.log(`✅ AI Assistant Initialized with ID: ${assistantId}`);
    } catch (error) {
        console.error("❌ Error initializing AI Assistant:", error);
    }
})();

// ✅ Route to Send Tasks to AI Dev Squad
app.post("/ai-task", async (req, res) => {
    try {
        const { task } = req.body;
        if (!task) return res.status(400).json({ error: "Task is required" });

        if (!assistantId) return res.status(500).json({ error: "AI Assistant not initialized" });

        const aiResponse = await executeAITask(assistantId, task);
        res.json({ message: "AI Task Processed", aiResponse });
    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: error.message });
    }
});


app.post("/execute-task", async (req, res) => {
    const { task } = req.body;
    try {
        const response = await roundTableDecision(task);
        res.json({ message: "Task executed successfully", response });
    } catch (error) {
        res.status(500).json({ error: "Failed to execute task" });
    }
});


app.post("/create-agent", async (req, res) => {
    const { role } = req.body;
    try {
        const agent_id = await createAI_Agent(role);
        res.json({ message: "Agent created", agent_id });
    } catch (error) {
        res.status(500).json({ error: "Failed to create agent" });
    }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
