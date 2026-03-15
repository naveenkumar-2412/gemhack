import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function probe(version: string, model: string) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
    console.log(`Probing ${url}...`);
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Say OK" }] }]
            })
        });
        const data: any = await res.json();
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            console.log(`SUCCESS [${version}/${model}]:`, data.candidates?.[0]?.content?.parts?.[0]?.text);
            return true;
        } else {
            console.log(`FAILURE [${version}/${model}]:`, data.error?.message);
            return false;
        }
    } catch (err: any) {
        console.log(`ERROR [${version}/${model}]:`, err.message);
        return false;
    }
}

async function run() {
    const attempts = [
        { v: "v1", m: "gemini-1.5-flash" },
        { v: "v1beta", m: "gemini-1.5-flash" },
        { v: "v1beta", m: "gemini-2.0-flash-exp" },
        { v: "v1beta", m: "gemini-1.5-pro" }
    ];

    for (const a of attempts) {
        if (await probe(a.v, a.m)) {
            console.log("\nFOUND WORKING COMBINATION:", a.v, a.m);
            process.exit(0);
        }
    }
    process.exit(1);
}

run();
