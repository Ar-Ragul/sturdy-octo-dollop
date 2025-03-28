import OpenAI from "openai";
import dotenv from "dotenv";

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

const aiThreads = {};

const agentPipeline = {
    "Software Architect": "Developer",
    "Developer": "QA",
    "QA": null  // No next agent after QA
};


/**
 * Assigns a task to an AI Agent and forwards results to the next in the pipeline.
 * @param {string} agentId - The ID of the AI Assistant.
 * @param {string} task - The task to be assigned.
 * @param {string} role - The role of the agent (SA, Dev, QA).
 * @returns {Promise<string>} - AI-generated response.
 */


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
export async function createAI_Agent(role, instructions) {
    try {
        // Check if this role already exists
        const existingAgent = defaultAgents.find(agent => agent.role === role);
        if (existingAgent) {
            return { agentId: existingAgent.id, name: existingAgent.name };
        }

        // If not, create a new AI assistant
        const assistant = await openai.beta.assistants.create({
            name: role,
            instructions: instructions,
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

export async function assignTaskToAgent(agentId, task, role, broadcast) {
    try {
        console.log(`📨 Assigning Task to AI Agent (${role}): ${agentId}`);

        // Notify clients that the task is being assigned
        broadcast({ type: "TASK_ASSIGNING", data: { agentId, task, role } });

        // Create a new thread if it doesn't exist
        if (!aiThreads[agentId]) {
            console.log(`⚠️ Creating a new thread for ${role}`);
            aiThreads[agentId] = await openai.beta.threads.create();
        }

        const threadId = aiThreads[agentId].id;

        // Add the task to the thread
        await openai.beta.threads.messages.create(threadId, { role: "user", content: task });

        // Start the task
        const run = await openai.beta.threads.runs.create(threadId, { assistant_id: agentId });

        console.log(`✅ AI Task Started for ${role}:`, run);

        // Notify clients that the task has started
        broadcast({ type: "TASK_STARTED", data: { agentId, task, role, runId: run.id } });

        let retries = 0;
        let responseText = "";

        // Poll for task completion
        while (retries < 30) {
            const runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

            console.log(`⏳ Checking status for ${role}:`, runStatus.status);

            // Handle different run statuses
            switch (runStatus.status) {
                case "completed":
                    const response = await openai.beta.threads.messages.list(threadId);
                    responseText = response.data
                        .map((msg) => msg.content.map((c) => c.text.value).join("\n"))
                        .join("\n\n");

                    console.log(`✅ ${role} AI Completed Task:`, responseText);

                    // Notify clients that the task is completed
                    broadcast({ type: "TASK_COMPLETED", data: { agentId, task, role, response: responseText } });

                    return responseText;

                case "queued":
                    console.log(`🚨 ${role} task is still queued. Retrying...`);
                    break;

                case "in_progress":
                    console.log(`⏳ ${role} is processing the task...`);
                    break;

                case "requires_action":
                    console.log(`🔄 ${role} requires additional action. Attempting to auto-resolve...`);

                    if (runStatus.required_action?.type === "submit_tool_outputs") {
                        console.log(`🛠️ AI is waiting for tool execution. Submitting fake tool outputs...`);

                        // Extract tool calls from OpenAI response
                        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;

                        // Simulate a tool output
                        const toolOutputs = toolCalls.map((tool) => ({
                            tool_call_id: tool.id,
                            output: "✅ Tool execution completed successfully.",
                        }));

                        // Submit the tool outputs back to OpenAI
                        await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, { tool_outputs: toolOutputs });

                        console.log(`✅ Submitted tool execution results to OpenAI.`);
                    } else {
                        console.log(`⚠️ Unhandled \`requires_action\` type:`, runStatus.required_action);
                        break; // Stop retrying if we don't know what action to take
                    }
                    break;

                case "failed":
                    console.error(`❌ ${role} AI Task Failed.`);

                    // Notify clients that the task failed
                    broadcast({ type: "TASK_FAILED", data: { agentId, task, role, error: `AI Task Execution Failed for ${role}` } });

                    return { error: `AI Task Execution Failed for ${role}` };

                default:
                    console.log(`⚠️ Unknown status: ${runStatus.status}`);
                    break;
            }

            retries++;
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait & retry
        }

        // Handle timeout
        if (!responseText) {
            console.error(`❌ ${role} AI did not return a response.`);

            // Notify clients that the task timed out
            broadcast({ type: "TASK_TIMEOUT", data: { agentId, task, role, error: `${role} AI did not complete.` } });

            return { error: `${role} AI did not complete.` };
        }
    } catch (error) {
        console.error(`❌ Task Assignment Error for ${role}:`, error);

        // Notify clients about the error
        broadcast({ type: "TASK_ERROR", data: { agentId, task, role, error: `AI Task Execution Failed for ${role}` } });

        return { error: `AI Task Execution Failed for ${role}` };
    }
}


// export async function assignTaskToAgent(agentId, task, role, broadcast) {
//     try {
//         console.log(`📨 Assigning Task to AI Agent (${role}): ${agentId}`);

//         // Notify clients that the task is being assigned
//         broadcast({ type: "TASK_ASSIGNING", data: { agentId, task, role } });

//         // Create a new thread if it doesn't exist
//         if (!aiThreads[agentId]) {
//             console.log(`⚠️ Creating a new thread for ${role}`);
//             aiThreads[agentId] = await openai.beta.threads.create();
//         }

//         const threadId = aiThreads[agentId].id;

//         // Add the task to the thread
//         await openai.beta.threads.messages.create(threadId, { role: "user", content: task });

//         // Start the task with streaming
//         const stream = await openai.beta.threads.runs.create(threadId, {
//             assistant_id: agentId,
//             stream: true, // Enable streaming
//         });

//         console.log(`✅ AI Task Started for ${role} with streaming`);

//         // Notify clients that the task has started
//         broadcast({ type: "TASK_STARTED", data: { agentId, task, role } });

//         let responseText = "";

//         // Listen for events from the stream
//         for await (const event of stream) {
//             console.log(`⏳ Stream Event for ${role}:`, event.event);

//             // Handle different event types
//             switch (event.event) {
//                 case "thread.message.delta":
//                     // Handle incremental message updates
//                     const delta = event.data.delta;
//                     if (delta.content && delta.content.length > 0) {
//                         const newText = delta.content[0].text.value;
//                         responseText += newText; // Append the new text to the response

//                         // Broadcast the incremental update to the client
//                         broadcast({ type: "TASK_UPDATE", data: { agentId, task, role, response: responseText } });
//                     }
//                     break;

//                 case "thread.run.completed":
//                     // Fetch the final response when the run is completed
//                     const response = await openai.beta.threads.messages.list(threadId);
//                     responseText = response.data
//                         .map((msg) => msg.content.map((c) => c.text.value).join("\n"))
//                         .join("\n\n");

//                     console.log(`✅ ${role} AI Completed Task:`, responseText);

//                     // Notify clients that the task is completed
//                     broadcast({ type: "TASK_COMPLETED", data: { agentId, task, role, response: responseText } });

//                     return responseText;

//                 case "thread.run.requires_action":
//                     console.log(`🔄 ${role} requires additional action. Attempting to auto-resolve...`);

//                     if (event.data.required_action?.type === "submit_tool_outputs") {
//                         console.log(`🛠️ AI is waiting for tool execution. Submitting fake tool outputs...`);

//                         // Extract tool calls from OpenAI response
//                         const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;

//                         // Simulate a tool output
//                         const toolOutputs = toolCalls.map((tool) => ({
//                             tool_call_id: tool.id,
//                             output: "✅ Tool execution completed successfully.",
//                         }));

//                         // Submit the tool outputs back to OpenAI
//                         await openai.beta.threads.runs.submitToolOutputs(threadId, event.data.id, { tool_outputs: toolOutputs });

//                         console.log(`✅ Submitted tool execution results to OpenAI.`);
//                     } else {
//                         console.log(`⚠️ Unhandled \`requires_action\` type:`, event.data.required_action);
//                     }
//                     break;

//                 case "thread.run.failed":
//                     console.error(`❌ ${role} AI Task Failed.`);
//                     console.error("Failure Details:", event.data);

//                     // Notify clients that the task failed
//                     broadcast({ type: "TASK_FAILED", data: { agentId, task, role, error: `AI Task Execution Failed for ${role}: ${event.data.last_error?.message || "Unknown error"}` } });

//                     return { error: `AI Task Execution Failed for ${role}: ${event.data.last_error?.message || "Unknown error"}` };

//                 default:
//                     console.log(`⚠️ Unknown event type: ${event.event}`);
//                     break;
//             }
//         }
//     } catch (error) {
//         console.error(`❌ Task Assignment Error for ${role}:`, error);

//         // Notify clients about the error
//         broadcast({ type: "TASK_ERROR", data: { agentId, task, role, error: `AI Task Execution Failed for ${role}: ${error.message}` } });

//         return { error: `AI Task Execution Failed for ${role}: ${error.message}` };
//     }
// }



/**
 * Retrieves AI Agent ID by Role
 */
let cachedAgents = {}; // ✅ Store AI agent mappings { role: id }

async function getAgentByRole(role) {
    if (cachedAgents[role]) return cachedAgents[role]; // ✅ Return existing agent

    console.log(`🔍 Fetching AI Agent for Role: ${role}`);
    const assistants = await openai.beta.assistants.list();
    const agent = assistants.data.find(a => a.name === role);

    if (agent) {
        cachedAgents[role] = agent; // ✅ Store in cache
        return agent;
    } else {
        console.error(`❌ No AI Agent found for role: ${role}`);
        return null;
    }
}




