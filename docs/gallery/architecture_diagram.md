# TriSense OS: Technical Architecture

```mermaid
graph TD
    subgraph Client ["Client Layer (Browser)"]
        UI["Glassmorphism SPA (Vanilla JS/CSS)"]
        SSE["SSE Stream Consumer"]
        WS["WebSocket Client (Mic/Audio)"]
    end

    subgraph Backend ["Cognitive Orchestration (Node.js/Express)"]
        Router["Cognitive Router (Intent Analysis)"]
        Orchestrator["Swarm Orchestrator (Multi-Agent Chaining)"]
        Registry["Engine Registry (11 Expert Engines)"]
        Memory["Memory Store (Semantic Retrieval/RAG)"]
        Cache["Cache Manager (Enterprise Efficiency)"]
    end

    subgraph AI ["Intelligence Layer (Gemini)"]
        Flash["Gemini 2.0 Flash (Text/Vision/Reasoning)"]
        Live["Gemini 1.5 Flash (Real-time Audio)"]
    end

    subgraph Data ["Persistence Layer (GCP)"]
        Firestore["Firestore (Session Turns)"]
        VectorDB["Enterprise Vector DB (Semantic Context)"]
        Secret["Secret Manager (GEMINI_API_KEY)"]
    end

    UI --> Router
    Router --> Orchestrator
    Orchestrator --> Registry
    Registry --> Flash
    WS --> Live
    Registry --> Memory
    Memory --> VectorDB
    Orchestrator --> Cache
    Orchestrator --> Firestore
    Flash --> SSE
    Live --> WS
```

### Component Breakdown

| Component | Responsibility |
|---|---|
| **Cognitive Router** | Analyzes user intent and autonomously selects the optimal expert engine(s). |
| **Swarm Orchestrator** | Coordinates multi-intent chaining and merging results from multiple agents. |
| **Engine Registry** | Manages 11 specialized personas with tailored system instructions and UI metrics. |
| **Memory Store** | Implements long-term semantic persistence via Vector RAG. |
| **Security Layer** | Multi-layer guardrails and API Quota Resilience (429 Fallback). |
