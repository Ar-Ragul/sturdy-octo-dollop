import express from "express";
import cors from "cors";
import { Readable } from "stream";
import { listAgents, createAI_Agent, roundTableDecision, assignTaskToAgent} from "./services/agentService.js";
import { chatWithAI } from "./services/chatService.js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());



/**
 * ✅ Fetch Existing AI Agents (Predefined & Created)
 */
app.get("/agents", async (req, res) => {
    try {
        const agents = await listAgents();
        res.json({ agents });
    } catch (error) {
        console.error("❌ Error fetching agents:", error);
        res.status(500).json({ error: "Failed to retrieve agents" });
    }
});

/**
 * ✅ AI Architect Creates a New AI Agent
 */
app.post("/create-agent", async (req, res) => {
    try {
        const { role, architectId } = req.body;
        if (!role || !architectId) {
            return res.status(400).json({ error: "Role and Architect ID are required." });
        }

        const agent = await createAI_Agent(role, architectId);
        res.json({ message: "Agent Created", agent });
    } catch (error) {
        console.error("❌ Error creating AI agent:", error);
        res.status(500).json({ error: "Agent creation failed." });
    }
});

/**
 * ✅ AI Multi-Agent Roundtable Discussion
 */
app.post("/roundtable", async (req, res) => {
    try {
        const { task } = req.body;
        if (!task) {
            return res.status(400).json({ error: "Task is required." });
        }

        const responses = await roundTableDecision(task);
        res.json({ message: "AI Roundtable Completed", responses });
    } catch (error) {
        console.error("❌ Error in AI roundtable discussion:", error);
        res.status(500).json({ error: "AI Roundtable Discussion Failed." });
    }
});

app.post("/chat", async (req, res) => {
    chatWithAI(req.body.prompt).then((response) => {
        res.json({ response });
    }
    );
});

/**
 * ✅ Assign a Task to an AI Agent (POST Request)
 */
app.post("/assign-task", async (req, res) => {
    try {
        const { agentId, task, role } = req.body;
        if (!agentId || !task || !role) {
            return res.status(400).json({ error: "Missing agentId, task, or role." });
        }

        const response = await assignTaskToAgent(agentId, task, role);
        res.json({ response });

    } catch (error) {
        console.error("❌ Task Pipeline Error:", error);
        res.status(500).json({ error: "AI Task Execution Failed." });
    }
});


app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
