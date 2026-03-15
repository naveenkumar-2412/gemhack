import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

async function run() {
    try {
        const modelName = "gemini-1.5-flash"; 
        console.log(`Testing with ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("test");
        console.log("SUCCESS:", result.response.text());
    } catch (err: any) {
        console.log("FAILED 1.5-flash:", err.message);
        try {
            console.log("Testing with gemini-flash-latest...");
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const result = await model.generateContent("test");
            console.log("SUCCESS with gemini-flash-latest!");
        } catch (err2: any) {
            console.log("FAILED gemini-flash-latest:", err2.message);
        }
    }
}
run();
