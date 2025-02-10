import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let architectTask = ""; // ✅ Stores the main Architect task

/**
 * ✅ Stores the latest Architect's task.
 */
export function storeArchitectTask(task) {
    console.log(`📝 Architect assigned task: ${task}`);
    architectTask = task;
}

/**
 * ✅ Fetches the latest Architect's task.
 */
export function getLatestArchitectTask() {
    return architectTask || "No task has been assigned yet.";
}

/**
 * ✅ AI Company Workflow:
 * 1️⃣ AI Architect defines project scope
 * 2️⃣ AI Developers decide tech stack & write code
 * 3️⃣ AI Lead Engineer reviews & integrates code
 */
export async function runCompanyWorkflow(projectTask) {
    console.log(`🏢 AI Company received project: ${projectTask}`);

    // Step 1️⃣: AI Architect defines the scope
    const scopeResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `You are a Software Architect. Define the technical scope for: ${projectTask}` }],
    });

    const projectScope = scopeResponse.choices[0].message.content;
    console.log(`📌 AI Architect Defined Scope:\n`, projectScope);

    // Step 2️⃣: AI Developers select tech stack & implement features
    const techStackResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `You are a team of software engineers. Decide on the best tech stack for: ${projectTask}` }],
    });

    const techStack = techStackResponse.choices[0].message.content;
    console.log(`🛠 AI Developers Chose Tech Stack:\n`, techStack);

    let developerOutputs = [];

    // AI Developers generate code for core features
    const features = ["User Authentication", "Database Schema", "API Endpoints", "Security Measures"];
    for (const feature of features) {
        console.log(`👨‍💻 AI Developer working on: ${feature}`);

        const featureCodeResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `Write full implementation code for: ${feature} in ${techStack}` }],
        });

        const aiCode = featureCodeResponse.choices[0].message.content;
        developerOutputs.push({ feature, aiCode });
    }

    // Step 3️⃣: AI Lead Engineer reviews & integrates the code
    const integrationResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "user", content: `You are a Lead Engineer. Here is the code from different teams:\n${JSON.stringify(developerOutputs)}\n\nReview and integrate them into a complete project.` },
        ],
    });

    const finalProject = integrationResponse.choices[0].message.content;
    console.log(`✅ AI Lead Engineer Finalized Project:\n`, finalProject);

    return { projectScope, techStack, developerOutputs, finalProject };
}
