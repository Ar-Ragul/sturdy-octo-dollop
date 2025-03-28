import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { listAgents, createAI_Agent, roundTableDecision, assignTaskToAgent} from "./services/agentService.js";
import { chatWithAI } from "./services/chatService.js";

const app = express();
const PORT = 3000;
// const WebSocket = require("ws");

app.use(cors());
app.use(express.json());

// WebSocket server
const server = createServer(app);

const wss = new WebSocketServer({ server });



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
        const { role, agentDescription } = req.body;
        if (!role || !agentDescription) {
            return res.status(400).json({ error: "Role or Description are required." });
        }

        const agent = await createAI_Agent(role,agentDescription );
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

        // Broadcast function to send updates to all WebSocket clients
        const broadcast = (data) => {
            console.log("Broadcasting:", data); // Add this line
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        };

        // Assign the task
        const response = await assignTaskToAgent(agentId, task, role, broadcast);

        res.json({ response });
    } catch (error) {
        console.error("❌ Task Pipeline Error:", error);
        res.status(500).json({ error: "AI Task Execution Failed." });
    }
});
  


wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

// Start the HTTP server
server.listen(PORT, () => {
    console.log(`HTTP and WebSocket servers are running on http://localhost:${PORT}`);
});
