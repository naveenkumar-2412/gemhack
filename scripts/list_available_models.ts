import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No API key found");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    try {
        const result = await genAI.listModels();
        console.log("Found Models:");
        result.models.forEach(m => {
            console.log(`- ${m.name} (${m.supportedGenerationMethods.join(", ")})`);
        });
    } catch (err: any) {
        console.error("Failed to list models:", err.message);
    }
}

run();
