import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let ASSISTANT_ID = null;
const agents = []; // Local agent storage

/**
 * ✅ Register a Local Agent (Used in UI)
 */
const registerLocalAgent = (role) => {
    const agentId = `agent-${Date.now()}`;
    const newAgent = { id: agentId, role };
    agents.push(newAgent);
    return newAgent;
};

/**
 * ✅ List all Local Agents
 */
export async function listAgents() {
    try {
        const assistants = await openai.beta.assistants.list(); // ✅ Fetch from OpenAI
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
 * ✅ Create a Persistent AI Assistant (Avoid Duplicates)
 */
export async function createAssistant() {
    if (ASSISTANT_ID) return ASSISTANT_ID; // Reuse existing assistant

    try {
        const assistant = await openai.beta.assistants.create({
            name: "AI Project Manager",
            instructions: "You are an Scrum Master that facilitates collaborative decision-making.",
            tools: [{ type: "code_interpreter" }],
            model: "gpt-4o-mini",
        });

        ASSISTANT_ID = assistant.id;
        console.log(`✅ Assistant Created: ${ASSISTANT_ID}`);
        return ASSISTANT_ID;
    } catch (error) {
        console.error("❌ Error creating assistant:", error);
        throw new Error("Failed to create AI Assistant.");
    }
}

/**
 * ✅ Create a Specialized AI Agent (Persistent)
 */
export async function createAI_Agent(role) {
    try {
        const assistant = await openai.beta.assistants.create({
            name: role,
            instructions: `You are an AI ${role} responsible for decision-making.`,
            tools: [{ type: "code_interpreter" }],
            model: "gpt-4o-mini",
        });

        console.log(`✅ ${role} AI Agent Created: ${assistant.id}`);
        return { agentId: assistant.id };
    } catch (error) {
        console.error("❌ Failed to create AI agent:", error);
        throw new Error("Failed to create AI agent.");
    }
}

/**
 * ✅ AI Round Table Decision-Making
 */
export async function roundTableDecision(task) {
    try {
        // Define key roles (architect, developers, QA, etc.)
        const roles = ["Software Architect", "Developer", "QA"];
        
        const agentIds = [];
        for (const role of roles) {
            const agent = await createAI_Agent(role);
            agentIds.push(agent.agentId);
        }

        const agentResponses = [];

        // Create a shared thread for the discussion
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
                await new Promise((resolve) => setTimeout(resolve, 2000)); // Retry delay
            }

            agentResponses.push(response.data[0].content);
        }

        return agentResponses;
    } catch (error) {
        console.error("❌ Round Table Decision Error:", error);
        return "⚠️ AI failed to reach a decision.";
    }
}

/**
 * ✅ Execute an AI Task (Single AI Assistant)
 */
export async function executeAITask(userMessage) {
    try {
        const assistantId = await createAssistant(); // Ensure assistant exists

        // Create new discussion thread
        const thread = await openai.beta.threads.create();
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: userMessage,
        });

        // Start AI processing
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistantId,
        });

        console.log("⏳ AI is processing...");

        let response;
        while (true) {
            const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            if (runStatus.status === "completed") {
                response = await openai.beta.threads.messages.list(thread.id);
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Retry delay
        }

        return response.data[0].content;
    } catch (error) {
        console.error("❌ Assistance API Error:", error);
        return "⚠️ AI Assistant failed to process.";
    }
}

export { registerLocalAgent };
