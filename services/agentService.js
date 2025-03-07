import OpenAI from "openai";
import dotenv from "dotenv";
import util from "util";
import { Readable } from "stream";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Default AI Agents (Manually Created)
const defaultAgents = [
    { id: "asst_sales_manager", name: "Sales Manager", role: "Sales" },
    { id: "asst_bank_manager", name: "Bank Manager", role: "Finance" },
    { id: "asst_ai_project_manager", name: "AI Project Manager", role: "AI Management" },
    { id: "asst_software_architect", name: "Software Architect", role: "Software Design" },
    { id: "asst_personal_trainer", name: "Personal Trainer", role: "Health & Fitness" }
];

/**
 * ✅ Fetch AI Agents (Predefined + Dynamically Created)
 */
export async function listAgents() {
    try {
        const assistants = await openai.beta.assistants.list(); // Fetch from OpenAI
        return assistants.data.map(assistant => ({
            id: assistant.id,
            name: assistant.name,
            instructions: assistant.instructions
        }));
    } catch (error) {
        console.error("❌ Error fetching agents from OpenAI:", error);
        return [];
    }
}

/**
 * ✅ AI Architect Creates New AI Assistants (e.g., Developers, QA)
 */
export async function createAI_Agent(role, architectId) {
    try {
        // Check if this role already exists
        const existingAgent = defaultAgents.find(agent => agent.role === role);
        if (existingAgent) {
            return { agentId: existingAgent.id, name: existingAgent.name };
        }

        // If not, create a new AI assistant
        const assistant = await openai.beta.assistants.create({
            name: role,
            instructions: `You are an AI ${role} created by ${architectId} to assist in project development.`,
            tools: [{ type: "code_interpreter" }],
            model: "gpt-4o-mini",
        });

        console.log(`✅ ${role} AI Agent Created: ${assistant.id}`);
        return { agentId: assistant.id, name: assistant.name };
    } catch (error) {
        console.error("❌ Failed to create AI agent:", error);
        return { error: "Agent creation failed." };
    }
}

/**
 * ✅ AI Agents Collaborate on a Task (Roundtable Discussion)
 */
export async function roundTableDecision(task) {
    try {
        const agentRoles = ["Software Architect", "Developer", "QA"];
        
        const agentIds = [];
        for (const role of agentRoles) {
            const agent = await createAI_Agent(role, "Master Architect");
            agentIds.push(agent.agentId);
        }

        const agentResponses = [];

        // Create a shared thread for discussion
        const thread = await openai.beta.threads.create();

        for (const agentId of agentIds) {
            await openai.beta.threads.messages.create(thread.id, {
                role: "user",
                content: `What is your approach to "${task}"?`,
            });

            const run = await openai.beta.threads.runs.create(thread.id, {
                assistant_id: agentId,
            });

            let response;
            while (true) {
                const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
                if (runStatus.status === "completed") {
                    response = await openai.beta.threads.messages.list(thread.id);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait & retry
            }

            agentResponses.push(response.data[0].content);
        }

        return agentResponses;
    } catch (error) {
        console.error("❌ Round Table Decision Error:", error);
        return "⚠️ AI failed to reach a decision.";
    }
}

export async function executeAITask(agentId, task, res) {
    try {
        console.log("📨 Sending Task to AI Agent:", agentId, task);

        const thread = await openai.beta.threads.create();
        await openai.beta.threads.messages.create(thread.id, { role: "user", content: task });
        const run = await openai.beta.threads.runs.create(thread.id, { assistant_id: agentId });

        console.log("⏳ AI is processing...");

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let completed = false;
        while (!completed) {
            const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

            if (runStatus.status === "completed") {
                const response = await openai.beta.threads.messages.list(thread.id);

                for (const msg of response.data) {
                    res.write(`data: ${JSON.stringify(msg.content.map(c => c.text.value).join("\n"))}\n\n`);
                }
                completed = true;
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        res.end();
    } catch (error) {
        console.error("❌ AI Streaming Error:", error);
        res.write(`data: Error: AI Assistant failed to process.\n\n`);
        res.end();
    }
}


export async function assignTaskToAgent(agentId, task, res) {
    try {
        console.log(`📨 Assigning Task to AI Agent: ${agentId}`);

        // Create a new AI thread for this task
        const thread = await openai.beta.threads.create();
        await openai.beta.threads.messages.create(thread.id, { role: "user", content: task });

        // Start AI processing
        const run = await openai.beta.threads.runs.create(thread.id, { assistant_id: agentId });
        console.log(`✅ AI Task Started:`, run);

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Poll AI response
        let completed = false;
        while (!completed) {
            const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

            if (runStatus.status === "completed") {
                const response = await openai.beta.threads.messages.list(thread.id);
                for (const message of response.data) {
                    if (message?.content?.[0]?.text?.value) {
                        res.write(`data: ${JSON.stringify({ text: message.content[0].text.value })}\n\n`);
                    }
                }
                completed = true;
            }

            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait & retry
        }

        console.log(`✅ AI Task Completed`);
        res.end();
    } catch (error) {
        console.error("❌ AI Task Error:", error);
        res.write(`data: ${JSON.stringify({ error: "AI Task Execution Failed" })}\n\n`);
        res.end();
    }
}


