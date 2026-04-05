# Project Specification: AI-Powered Telegram Crypto Portfolio Tracker

## 1. Project Overview
Build a Telegram bot that acts as an elite crypto hedge fund analyst named "Atlas." The bot allows users to track their crypto portfolio and converse organically to request deep-dive fundamental and technical analysis. The bot uses a fully agentic ReAct loop for Q&A, and a highly optimized concurrent data pipeline for full portfolio analysis.

## 2. Tech Stack & Infrastructure
* **Runtime:** Node.js (Standard VPS deployment, no serverless).
* **Language:** TypeScript (Strict mode enabled).
* **Bot Framework:** `grammY` (using long-polling).
* **AI Orchestration:** `@openai/agents` (OpenAI's official Agent SDK).
* **LLM:** `gpt-5-mini`
* **Validation:** `zod` (for strict tool input/output validation).
* **Database:** Self-hosted MongoDB (via Docker).
* **ORM:** `mongoose`.

## 3. Database Schema (Mongoose)
The database must use document embedding to store user portfolios natively within the user document.

\`\`\`typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IAsset {
  ticker: string;
  amount: number;
  averageBuyPrice?: number;
}

export interface IUser extends Document {
  telegramId: number;
  username?: string;
  portfolio: IAsset[];
  createdAt: Date;
}

const AssetSchema = new Schema({
  ticker: { type: String, required: true, uppercase: true },
  amount: { type: Number, required: true },
  averageBuyPrice: { type: Number, required: false }
}, { _id: false });

const UserSchema = new Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: { type: String, required: false },
  portfolio: [AssetSchema],
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model<IUser>('User', UserSchema);
\`\`\`

## 4. Agent Architecture & System Prompt
The core routing must be handled by the `@openai/agents` SDK. 

**System Prompt (Persona):**
> "You are 'Atlas,' an elite, highly analytical, and slightly blunt crypto portfolio manager. You are chatting with a client on Telegram. Your tone is direct, objective, and free of corporate jargon. Use the provided tools to fetch real-time data before analyzing a user's portfolio. If a user holds risky, illiquid meme coins, warn them bluntly. Format all responses in clean, mobile-friendly Telegram MarkdownV2 (use short paragraphs and strategic bolding). Never remind the user you are an AI."

## 5. Toolbelt Definitions (Agentic Functions)
The coding agent must implement these specific tools using TypeScript and validate all LLM inputs using `zod`. 

### Internal DB Tools
1.  **`get_user_portfolio`**
    * **Input Schema:** `z.object({ telegramId: z.number() })`
    * **Logic:** Queries MongoDB. Returns the array of `IAsset` objects.

2.  **`update_user_portfolio`**
    * **Input Schema:** `z.object({ telegramId: z.number(), action: z.enum(['add', 'remove', 'update']), ticker: z.string().toUpperCase(), amount: z.number() })`
    * **Logic:** Upserts or modifies the specific asset in the user's MongoDB document.

### External API Tools (Data Sources)
*Note: Implement the scaffolding/fetch logic for these. Use free-tier alternatives where noted.*

3.  **`get_price_and_volume` (Source: CoinMarketCap / CoinGecko Free API)**
    * **Input Schema:** `z.object({ ticker: z.string() })`
    * **Output:** Current USD price, 24h volume, Market Cap.

4.  **`get_onchain_fundamentals` (Source: DefiLlama API - Free)**
    * **Input Schema:** `z.object({ ticker: z.string() })`
    * **Output:** Total Value Locked (TVL), 24h DEX Volume, Active Users.

5.  **`get_token_unlocks` (Source: DropsTab / TokenUnlocks)**
    * **Input Schema:** `z.object({ ticker: z.string() })`
    * **Output:** Next unlock date, amount unlocking, and percentage of supply.

6.  **`get_smart_money_flows` (Source: Arkham Intelligence - Free Tier)**
    * **Input Schema:** `z.object({ ticker: z.string() })`
    * **Output:** Recent net-flows from labeled funds/whales.

7.  **`search_whale_alerts` (Source: Apify / X Scraper Database)**
    * **Input Schema:** `z.object({ ticker: z.string() })`
    * **Output:** Any recent viral whale movements related to the ticker.

## 6. User Flows & Bot Setup (`grammY`)
* **Middleware:** Implement an automatic check that ensures every user interacting with the bot has a document created in MongoDB.
* **UX Features:** Trigger `sendChatAction('typing')` immediately when a message is received so the user knows the agent is thinking/fetching data.
* **Core Commands:**
    * `/start` - Initializes user in DB and introduces Atlas.
    * `/analyze` - Triggers the optimized full portfolio review (see Section 7).
* **Organic Conversation:** If a user simply texts *"I just bought 50 SOL"*, the text is passed to the Agent. The Agent should recognize the intent, call `update_user_portfolio`, and reply conversationally: *"Logged. 50 SOL added to your bags."*

---

## 7. Expected Data Flow & AI Logic (`/analyze` Macro-Flow)

Mapping out the data flow for the `/analyze` command is the most critical step. To prevent the bot from timing out while looping through tools, the full portfolio analysis must utilize a concurrent fan-out approach.

### Phase 1: The Step-by-Step Data Flow
This is the exact lifecycle of a single `/analyze` request.

1. **The Trigger (Telegram):** The user types `/analyze` in the bot.
2. **Database Lookup (MongoDB):** The Node.js backend instantly queries MongoDB: *"What tokens does user ID 12345 hold?"* (e.g., returns: 1000 ARB, 0.5 ETH).
3. **The Fan-Out (Concurrent Data Fetching):** The backend must use `Promise.all()` in TypeScript to ping the data sources for these assets at the exact same time:
    * **Thread A:** Asks CoinMarketCap for ARB & ETH current prices, 24h volume, and market cap.
    * **Thread B:** Asks DefiLlama for the TVL and 24h DEX volume.
    * **Thread C:** Asks Arkham Intelligence if "Smart Money" tags are net-buying or net-selling.
    * **Thread D:** Checks cached Apify scrapes for recent whale alerts.
    * **Thread E:** Checks TokenUnlocks for upcoming vesting schedules.
4. **Data Normalization (TypeScript Backend):** The APIs return massive, messy JSON files. The backend strips out the garbage using `zod` schemas and extracts only the relevant metrics, compiling them into a clean text dictionary.
5. **Prompt Injection:** The backend injects this cleaned data into the AI System Prompt template.
6. **The LLM Analysis (OpenAI):** The prompt is sent to `gpt-4o`. The AI reads the data, applies its financial logic, and writes the report.
7. **Delivery (Telegram):** The backend receives the text and sends it to the user formatted in clean MarkdownV2.
*Expected Latency: 5 to 8 seconds.*

### Phase 2: How the AI Actually Analyzes the Data
The AI is programmed to weigh conflicting data points like a real analyst:

* **The Supply vs. Demand Check:**
  * *Data:* TokenUnlocks says 5% of ARB supply unlocks in 2 days. CMC says trading volume is down 20%.
  * *AI Logic:* High incoming supply + low buying demand = High risk of price drop. **Action:** Recommend trimming the position or placing a stop-loss.
* **The "Hype vs. Reality" Check:**
  * *Data:* CMC shows token price is up 40% (Hype). DefiLlama shows network TVL and active users are down 10% (Reality).
  * *AI Logic:* The price action is purely speculative and unsupported by network usage. **Action:** Warn the user of a likely correction.
* **The "Smart Money" Confirmation:**
  * *Data:* User holds a meme coin that is dropping in price. However, Lookonchain tweets show a massive whale buying the dip, and Arkham shows institutional wallets accumulating.
  * *AI Logic:* Retail is panic selling, but smart money is buying. **Action:** Recommend holding or accumulating.

### Phase 3: The Prompt Engine Example
Behind the scenes, the compiled data sent to the AI should look like this:

> **System Prompt:** You are a ruthless, highly analytical crypto hedge fund manager. Analyze the user's portfolio based ONLY on the provided data. Do not hallucinate. Provide a 2-sentence summary of the portfolio's health, a bulleted breakdown of major risks or bullish signals, and a final verdict (Accumulate, Hold, or Trim) for each asset. Keep formatting clean for Telegram.
> 
> **User Portfolio:** 1000 ARB
> **Data Feed:**
> - Price (CMC): $0.85 (Down 2% 24h)
> - Fundamentals (DefiLlama): Arbitrum TVL $2.5B (Up 1% 24h)
> - Tokenomics: 1.5% of total ARB supply unlocks in 48 hours. 
> - Smart Money (Arkham/Lookonchain): Whale wallet '0x...' transferred 5M ARB to Binance 1 hour ago.