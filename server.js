import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import {executeAIWorkflow, storeArchitectTask, getLatestArchitectTask, executeAgentQuery} from "./services/agentService.js";


dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;


console.log("🔑 OpenAI API Key:", process.env.OPENAI_API_KEY);


app.post("/architect-task", async (req, res) => {
    try {
        const { task } = req.body;
        if (!task) return res.status(400).json({ error: "Task is required" });

        storeArchitectTask(task); // Save the task
        const aiNodesOutput = await executeAIWorkflow(task); // AI starts working on it
        res.json({ message: "Task started successfully", aiNodesOutput });
    } catch (error) {
        console.error("❌ Error processing task:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Get latest Architect's Task
app.get("/architect-task", async (req, res) => {
    try {
        const task = getLatestArchitectTask();
        res.json({ task });
    } catch (error) {
        console.error("❌ Error fetching task:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/developer-update", async (req, res) => {
    try {
        const { update } = req.body;
        if (!update) return res.status(400).json({ error: "Update is required" });

        const response = await agentService.executeAgentQuery(update, "Developer");
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
