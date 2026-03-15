# TriSense Agent Architecture

```mermaid
graph TD
    %% Frontend Layer
    subgraph Frontend [Glassmorphism SPA Front-end]
        UI[index.html & app.js]
        Tabs[Mode Tabs]
        Audio[Web Audio / Waveform Canvas]
        Video[Multi-media Renderers]
        SSE[SSE Stream Receiver]
    end

    %% Backend Layer
    subgraph Backend [Node.js Express Server (Cloud Run)]
        Server[server.ts]
        Router[API Routes /api/stream, /api/agent]
        WSS[WebSocket Server /ws]
        Rate[express-rate-limit]
        Logger[Structured Logger]

        subgraph Orchestration [Agent Orchestrator]
            Agent[agent.ts]
            LiveAgent[liveAgent.ts]
            Storyteller[storyteller.ts]
            UINavigator[uiNavigator.ts]
        end

        subgraph Integrations [External Integrations]
            Gemini(SDK: @google/generative-ai)
            GeminiVision(Vision API Helper)
            GeminiLive(WebSocket Relay)
            FirestoreLib(firestore.ts)
            SessionContext(sessionContext.ts)
        end
    end

    %% Google Cloud Infrastructure
    subgraph GCP [Google Cloud Services]
        CloudRun((Cloud Run<br>min-instances=1))
        Firestore[(Firestore<br>Sessions DB)]
        SecretManager{Secret Manager<br>API Keys}
    end

    %% External APIs
    subgraph API [Google Gemini API]
        ModelFlash[(gemini-2.0-flash)]
        ModelLive[(gemini-live-2.5-flash-preview)]
    end

    %% Connections
    UI -- "Audio Blobs (WS)" --> WSS
    UI -- "JSON & Image Base64 (POST)" --> Router
    UI -- "SSE Listen" --> Router

    WSS -- "Audio Chunks" --> GeminiLive
    Router -- "Rate Limited" --> Rate
    Rate --> Logger
    Logger --> Agent

    Agent -- "Fetch Context" --> SessionContext
    SessionContext -- "Read/Write" --> FirestoreLib
    FirestoreLib <--> Firestore

    Agent -- "Route Mode" --> LiveAgent
    Agent -- "Route Mode" --> Storyteller
    Agent -- "Route Mode" --> UINavigator

    LiveAgent -- "Text/Context" --> Gemini
    Storyteller -- "Prompt/Context" --> Gemini
    UINavigator -- "Screenshot/Prompt" --> GeminiVision

    Gemini --> ModelFlash
    GeminiVision --> ModelFlash
    GeminiLive <--> ModelLive

    %% Infrastructure Links
    SecretManager -. "Inject GEMINI_API_KEY" .-> CloudRun
    CloudRun -. "Hosts" .-> Backend

    classDef client fill:#2a2a3a,stroke:#4a4a6a,stroke-width:2px,color:#fff;
    classDef server fill:#1f334a,stroke:#3a5a8a,stroke-width:2px,color:#fff;
    classDef gcp fill:#1a3a2a,stroke:#2a5a3a,stroke-width:2px,color:#fff;
    classDef external fill:#3a1a1a,stroke:#5a2a2a,stroke-width:2px,color:#ffffff;

    class UI,Tabs,Audio,Video,SSE client;
    class Server,Router,WSS,Agent,LiveAgent,Storyteller,UINavigator,Gemini,GeminiVision,GeminiLive server;
    class CloudRun,Firestore,SecretManager gcp;
    class ModelFlash,ModelLive external;
```
