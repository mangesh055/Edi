# StatsFlow Architecture Overview

## Project Summary
**StatsFlow** is an AI-enabled data processing platform built with **FastAPI** (backend) and **React** (frontend), featuring an automated data cleaning pipeline with human-in-the-loop review, AI-powered chatbot interaction, and comprehensive data visualization capabilities.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React on Port 3000)                       │
│                                                                               │
│  HomePage → UploadPage → Dashboard → VisualizationPage → ChatbotPage       │
│    (Step 0)   (Step 1)    (Step 2)      (Step 3)          (Step 4)         │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  React Context API (DataContext)                                    │   │
│  │  - Centralized state management                                     │   │
│  │  - Tracks: sessionId, rawData, cleanedData, charts, messages       │   │
│  │  - currentStep (route guards for 4-phase linear workflow)          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Axios API Client (src/api/api.js)                                 │   │
│  │  - baseURL: relative paths (/api/*)                                │   │
│  │  - CRA proxy forwards to localhost:8000                            │   │
│  │  - 120s timeout (LLM responses)                                    │   │
│  │  - Request/response interceptors with logging                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↕ HTTP
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI on Port 8000)                         │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  main.py - FastAPI Application Entry Point                       │      │
│  │  - CORS Middleware (allows localhost:3000)                       │      │
│  │  - Lifespan handlers (startup/shutdown)                          │      │
│  │  - Registers 5 routers                                           │      │
│  │  - Health check endpoints                                        │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  ROUTERS (5 Main Endpoints)                                      │      │
│  ├──────────────────────────────────────────────────────────────────┤      │
│  │ 1. Upload Router   (/api/upload)      → Phase 1: Data Ingestion  │      │
│  │ 2. Cleaning Router (/api/clean/*)     → Phase 2: Automated Clean │      │
│  │ 3. Visualization   (/api/visualize/*) → Phase 3: Charts & Insights│     │
│  │ 4. Chatbot Router  (/api/chat/*)      → Phase 4: AI Q&A          │      │
│  │ 5. Sentiment Router(/api/sentiment/*) → Text Sentiment Analysis  │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                    ↓                                          │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  SERVICES (Business Logic)                                       │      │
│  ├──────────────────────────────────────────────────────────────────┤      │
│  │ • cleaning_engine.py          → Implements missing/outlier logic │      │
│  │ • health_score.py             → Computes data quality (0-100)    │      │
│  │ • quality_scorecard.py        → Detailed quality metrics         │      │
│  │ • anomaly_detection.py        → Identifies data anomalies        │      │
│  │ • chatbot_service.py          → LLM integration (Groq/OpenAI)    │      │
│  │ • visualization_service.py    → Chart generation                 │      │
│  │ • insights_service.py         → Statistical insights             │      │
│  │ • sentiment_analysis.py       → TextBlob-based sentiment          │      │
│  │ • pipeline_generator.py       → Exports reproducible cleaning code│      │
│  │ • ai_imputer.py               → Advanced AI-based imputation     │      │
│  │ • feature_engineering_service → AI-suggested features            │      │
│  │ • cloud_storage.py            → Optional cloud integration       │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                    ↓                                          │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  DATA MODELS (Pydantic & SQLAlchemy)                             │      │
│  ├──────────────────────────────────────────────────────────────────┤      │
│  │ • DataSession (PostgreSQL ORM Model)                             │      │
│  │   - Tracks one user's data processing session                    │      │
│  │   - Stores file paths, health scores, cleaning configs          │      │
│  │   - JSON fields: cleaning_summary, chat_history, review_summary  │      │
│  │   - Status lifecycle: uploaded→cleaned→visualized→approved       │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                    ↓                                          │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  DATABASES                                                       │      │
│  ├──────────────────────────────────────────────────────────────────┤      │
│  │ PostgreSQL + SQLAlchemy (Async)                                  │      │
│  │ ├─ Relational session/project metadata                          │      │
│  │ ├─ Scales with PgBouncer (connection pooling)                   │      │
│  │ └─ Table: data_sessions                                         │      │
│  │                                                                  │      │
│  │ MongoDB (Optional via Motor Async Driver)                        │      │
│  │ ├─ Flexible log storage                                         │      │
│  │ ├─ Chat history persistence                                     │      │
│  │ └─ Gracefully degraded if unavailable                           │      │
│  │                                                                  │      │
│  │ File System (uploads/ directory)                                │      │
│  │ ├─ Raw CSV files: {session_id}_raw.csv                          │      │
│  │ ├─ Cleaned files: {session_id}_cleaned.csv                      │      │
│  │ ├─ Approved files: {session_id}_approved.csv                    │      │
│  │ └─ Working copies: {session_id}_chatbot_working.csv             │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                    ↑                                          │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  UTILITIES                                                       │      │
│  │  • helpers.py → DataFrame JSON serialization, type detection    │      │
│  │  • config.py  → Environment variable management (Pydantic)      │      │
│  └──────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4-Phase Workflow

### **Phase 1: Upload (Raw Data Ingestion)**

**Flow:**
```
File Upload → Parse CSV/Excel → Compute Health Score → Create Session → Return Preview
   (React)      (Pandas)          (health_score.py)    (PostgreSQL)      (React)
```

**Frontend Component:** `UploadPage.jsx`
- File input with progress tracking
- Calls: `api.uploadDataset(file, onProgress)`

**Backend Endpoint:** `POST /api/upload`
- Handler: [upload.py](backend/app/routers/upload.py)
- Validates file type (.csv, .xlsx, .xls) and size (≤50MB)
- Parses file using Pandas
- Computes:
  - Raw health score (completeness, uniqueness, consistency, outlier ratio)
  - Quality scorecard (detailed metrics)
  - Anomaly detection report
  - Column type detection
- Creates `DataSession` record in PostgreSQL
- Saves raw file to `uploads/{session_id}_raw.csv`
- Returns: `session_id`, `health_score`, `data_preview`, `columns_info`

**Data Model:**
```python
class DataSession(Base):
    session_id: str (UUID)
    filename: str
    file_path: str (raw)
    original_rows/cols: int
    raw_health_score: float (0-100)
    status: "uploaded"
    created_at: DateTime
```

**State Update (React Context):**
```javascript
{
  sessionId, filename, rawShape, rawHealthScore,
  columnsInfo, dataPreview, columnNames, currentStep: 1
}
```

---

### **Phase 2: Cleaning (Automated & Human-in-the-Loop)**

**Flow:**
```
Clean Request → Apply Strategies → Track Changes → Persist → Present for Review
  (Dashboard)   (cleaning_engine)  (change log)  (PostgreSQL) (Review UI)
```

**Frontend Component:** `Dashboard.jsx`
- Displays raw preview + quality scorecard
- Strategy selector: Missing Value (auto/mean/median/mode/knn/drop/ai_impute) + Outlier (auto/zscore/iqr/none)
- Calls: `api.cleanDataset(sessionId, missingStrategy, outlierStrategy)`

**Backend Endpoint:** `POST /api/clean/{session_id}`
- Handler: [cleaning.py](backend/app/routers/cleaning.py)
- Service: `CleaningEngine` (stateful cleaning operations logger)
- Operations:
  1. Load raw data from disk
  2. Apply type coercion
  3. Replace placeholder tokens ("NA", "n/a", "-", etc.)
  4. Apply missing value strategy (strategy-specific imputation)
  5. Apply outlier strategy (zscore/IQR/none)
  6. Log every operation with metadata (type, params, affected rows/cols)
- Computes new health score (cleaned)
- Generates change log (each operation with before/after stats)
- Generates pipeline Python script (reproducible cleaning code)
- Saves cleaned file to `uploads/{session_id}_cleaned.csv`
- Stores summary in PostgreSQL: `cleaning_summary` (JSON)
- Returns: `cleaned_data_preview`, `health_score`, `change_log`, `cleaning_report`, `pipeline_script`

**Review & Approval Flow:**
- User reviews each cleaning change (in DataViewerModal)
- Endpoints:
  - `GET /api/clean/{session_id}/review` → Get current review state
  - `POST /api/clean/{session_id}/edit` → Edit a single cell
  - `POST /api/clean/{session_id}/review` → Submit feedback (approve/needs_changes/rerun)
  - `DELETE /api/clean/{session_id}/revert` → Revert selected changes

**Approval Guardrails:**
- Tracks all manual edits
- Allows reverting specific changes
- Requires explicit approval before proceeding to visualization
- Stores `review_summary` (JSON) in PostgreSQL

**Pipeline Script Generation:**
- Exports Python code that reproduces the cleaning pipeline
- Includes: import statements, DataFrame loading, all cleaning operations, output save
- Endpoint: `GET /api/clean/{session_id}/pipeline-script`

**Data Model Updates:**
```python
class DataSession:
    cleaned_file_path: str
    chatbot_working_file_path: str
    approved_file_path: str
    cleaned_rows/cols: int
    cleaned_health_score: float
    missing_strategy: str
    outlier_strategy: str
    cleaning_summary: JSON (operations log)
    review_summary: JSON (approval decisions)
    status: "cleaned" → "approved"
```

---

### **Phase 3: Visualizations & Insights**

**Flow:**
```
Load Cleaned Data → Generate Charts → Compute Insights → Return to React
   (disk)          (visualization)   (statistical)      (JSON)
```

**Frontend Component:** `VisualizationPage.jsx`
- Renders charts using Recharts/Plot.js
- Displays AI-generated insights below charts
- Calls: `api.visualizeData(sessionId)`

**Backend Endpoint:** `GET /api/visualize/{session_id}`
- Handler: [visualization.py](backend/app/routers/visualization.py)
- Service: `visualization_service.py`

**Chart Generation:**
1. **Histograms** (numeric columns)
   - Bins determined by Sturges' rule or Scott's rule
   - Shows distribution with mean/median overlays

2. **Bar Charts** (categorical columns, top 10 values)
   - Sorted by frequency
   - Shows value counts and percentages

3. **Correlation Heatmap** (numeric column pairs)
   - Pearson correlation matrix
   - Color-coded by correlation strength

4. **Box Plots** (numeric columns)
   - Shows Q1, median, Q3, IQR, whiskers
   - Highlights outlier points

5. **Scatter Plot** (most correlated numeric pair)
   - Shows trend and spread
   - Optional trendline

**Recommended Charts:**
- System suggests optimal chart types based on data structure
- Includes Power BI-style recommendations:
  - Column chart (avg metric by top category)
  - Stacked column chart (multi-metric breakdown)
  - Line chart (trend over index)
  - Pie chart (category distribution)
  - Area chart (smoothed trends)
  - Combo chart (dual-axis: bar + line)
  - Radar chart (multi-metric profile)
  - Treemap (hierarchical share)

**Insights Generation:**
- Service: `insights_service.py`
- Uses statistical methods to generate text insights:
  - Key metrics (mean, median, std dev)
  - Distribution descriptions (skewness, kurtosis)
  - Outlier summaries
  - Top category descriptions
  - Correlation highlights
  - Trend observations

**Response:**
```json
{
  "charts": [
    { "type": "histogram", "title": "...", "data": {...} },
    ...
  ],
  "recommended_charts": [...],
  "insights": [
    "The dataset contains X rows with Y columns...",
    "Age ranges from ... with mean ...",
    ...
  ]
}
```

---

### **Phase 4: Chatbot (Agentic Q&A)**

**Flow:**
```
User Question → Load Context → LLM Processing → Execute Actions → Persist & Return
    (Chat UI)    (DataFrame)   (Groq/OpenAI)   (data edits)     (MongoDB)
```

**Frontend Component:** `ChatbotPage.jsx`
- Chat message interface (ChatMessage.jsx)
- Calls: `api.chat(sessionId, message, history)`

**Backend Endpoint:** `POST /api/chat/{session_id}`
- Handler: [chatbot.py](backend/app/routers/chatbot.py)
- Service: `chatbot_service.py`

**Workflow:**
1. Load session and cleaned DataFrame from disk
2. Load conversation history from MongoDB
3. Build LLM context:
   - System prompt: Detailed instructions for dataset Q&A and actions
   - DataFrame schema (columns, types, sample rows)
   - Dataset statistics
   - Chat history
   - User message
4. Call LLM (Groq/OpenAI/Gemini/Anthropic)
   - Response format: JSON with `action`, `reasoning`, `response_text`
5. Execute detected actions (if any):
   - `drop_rows`: Remove rows matching criteria
   - `fill_value`: Impute missing values
   - `rename_column`: Rename column
   - `create_feature`: Add calculated column
   - `filter`: Subset data
   - `sort`: Sort rows
6. Save modified DataFrame to working copy: `{session_id}_chatbot_working.csv`
7. Persist chat history to MongoDB
8. Return: `response_text` + `action_details` + `updated_preview`

**LLM Configuration:**
- **Provider Selection** (from config.py):
  - `groq`: LLaMA 3.3 70B Versatile (default)
  - `openai`: GPT-4 / GPT-3.5 Turbo
  - `gemini`: Google Gemini
  - `anthropic`: Claude
- **API Key Management:** Pydantic settings load from .env
- **Async Clients:** Motor for MongoDB, AsyncOpenAI/AsyncAnthropic for LLMs

**Data Model:**
```python
chat_history (MongoDB):
{
  session_id: str,
  thread_id: str,
  messages: [
    { role: "user", content: str, timestamp: DateTime },
    { role: "assistant", content: str, action: {...}, timestamp: DateTime }
  ]
}
```

**State Update (React):**
```javascript
{
  messages: [
    { role: "user", content: "...", timestamp },
    { role: "assistant", content: "...", action: {...}, timestamp }
  ],
  isProcessing: false
}
```

---

## Database Architecture

### **PostgreSQL (Primary Relational Store)**

**Purpose:** Persistent session metadata

**Table: `data_sessions`**
```sql
CREATE TABLE data_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id VARCHAR(36) UNIQUE NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(512),
  cleaned_file_path VARCHAR(512),
  chatbot_working_file_path VARCHAR(512),
  approved_file_path VARCHAR(512),
  
  original_rows INTEGER,
  original_cols INTEGER,
  cleaned_rows INTEGER,
  cleaned_cols INTEGER,
  
  raw_health_score FLOAT,
  cleaned_health_score FLOAT,
  
  missing_strategy VARCHAR(50),
  outlier_strategy VARCHAR(50),
  
  cleaning_summary JSON,
  review_summary JSON,
  chat_history JSON,
  
  status VARCHAR(20) DEFAULT 'uploaded',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Async Connection:**
- SQLAlchemy with asyncpg driver (PostgreSQL) or aiosqlite (SQLite dev)
- Connection pooling via PgBouncer for production
- Prepared statement caching for performance

---

### **MongoDB (Optional Flexible Store)**

**Purpose:** Semi-structured logging and chat history

**Collections:**
- `chat_history`: Persists chat conversations per session
- `processing_logs`: Event logs for each operation
- `anomaly_records`: Detected anomalies per session

**Connection:**
- Motor async driver
- Gracefully degrades if MongoDB unavailable (warning logged, app continues)
- No dependency on MongoDB for core functionality

---

### **File System (Local Storage)**

**Directory Structure:**
```
uploads/
├── {session_id}_raw.csv
├── {session_id}_cleaned.csv
├── {session_id}_approved.csv
├── {session_id}_chatbot_working.csv
├── versions/
│   └── {session_id}/
│       ├── 20260520T113938Z.csv
│       └── 20260520T114003Z.csv
└── ...
```

**File Lifecycle:**
1. **Upload Phase**: Save raw CSV → `{session_id}_raw.csv`
2. **Cleaning Phase**: Generate cleaned CSV → `{session_id}_cleaned.csv`
3. **Review Phase**: User approves → `{session_id}_approved.csv`
4. **Chat Phase**: Modifications saved → `{session_id}_chatbot_working.csv`
5. **Versioning**: Each modification timestamped in `versions/`

**Max Upload:** 50MB (configurable via `max_file_size_mb`)

---

## Key Services Deep Dive

### **1. CleaningEngine (cleaning_engine.py)**

**Purpose:** Implements statistically valid cleaning strategies

**Strategies:**

**Missing Value Imputation:**
- `mean`: Numeric columns → column mean
- `median`: Numeric columns → column median
- `mode`: All columns → column mode
- `knn`: K-Nearest Neighbors imputation (scikit-learn)
- `drop`: Remove rows with any missing
- `ai_impute`: Advanced ML-based imputation

**Outlier Treatment:**
- `zscore`: Replace outliers (|Z|>3) with column median
- `iqr`: Replace values outside [Q1-1.5×IQR, Q3+1.5×IQR] with bounds
- `none`: Skip outlier treatment

**Operations Tracking:**
- Logs every operation with: type, parameters, affected rows, before/after stats
- Used by `PipelineGenerator` to export reproducible Python code

---

### **2. HealthScore (health_score.py)**

**Purpose:** Quantify data quality (0-100 scale)

**Dimensions (weighted):**
1. **Completeness** (40%): Non-null cell ratio
2. **Uniqueness** (20%): Penalizes duplicate rows
3. **Consistency** (20%): Detects type-mixed object columns
4. **Outlier Score** (20%): Penalizes high Z-score outlier ratios

**Formula:**
```
Total Score = 0.4×Completeness + 0.2×Uniqueness + 0.2×Consistency + 0.2×OutlierScore
```

**Labels:**
- 0-20: Critical
- 21-50: Poor
- 51-75: Fair
- 76-90: Good
- 91-100: Excellent

---

### **3. ChatbotService (chatbot_service.py)**

**Purpose:** LLM-powered dataset Q&A with action execution

**LLM Providers:**
- **Groq** (default): Ultra-fast LLaMA 3.3 70B
- **OpenAI**: GPT-4 / GPT-3.5 Turbo
- **Google Gemini**: Gemini API
- **Anthropic**: Claude

**Context Injection:**
- System prompt (detailed instructions)
- DataFrame schema (columns, types, dtypes)
- Dataset statistics (shape, null counts, numeric summaries)
- Sample rows (first N rows for context)
- Conversation history (previous messages for continuity)

**Action Detection:**
- LLM response parsed for JSON `action` field
- Supported actions:
  - `drop_rows`: Remove rows matching criteria
  - `fill_value`: Impute missing values
  - `rename_column`: Rename column
  - `create_feature`: Add calculated column
  - `filter`: Subset data
  - `sort`: Order rows

**Response Format (JSON):**
```json
{
  "action": "drop_rows|fill_value|...",
  "reasoning": "Explanation of why action is needed",
  "parameters": { "column": "...", "condition": "..." },
  "response_text": "User-facing explanation"
}
```

---

### **4. VisualizationService (visualization_service.py)**

**Purpose:** Generate chart-ready data payloads

**Chart Types:**
1. **Histogram**: Distribution of numeric columns
2. **Bar Chart**: Top 10 values of categorical columns
3. **Correlation Heatmap**: Pearson correlation matrix
4. **Box Plot**: Quartile stats with outlier markers
5. **Scatter Plot**: Most correlated numeric column pair
6. **Recommended Charts**: Power BI-style suggestions

**Chart Data Format (Recharts/Plot.js compatible):**
```json
{
  "type": "histogram|bar|heatmap|boxplot|scatter",
  "title": "Column Name Distribution",
  "data": [
    { "x": ..., "y": ..., ... }
  ],
  "meta": { "mean": ..., "median": ..., "stdev": ... }
}
```

---

### **5. SentimentAnalyzer (sentiment_analysis.py)**

**Purpose:** Analyze sentiment in text columns

**Implementation:** TextBlob (rule-based sentiment)

**Output:**
- Sentiment scores (-1 to +1)
- Polarity labels (positive/neutral/negative)
- Confidence scores
- Aggregated sentiment distribution

**Workflow:**
1. Auto-detect text columns (or accept user-specified list)
2. Analyze each cell with TextBlob
3. Add new columns: `{column}_sentiment`, `{column}_confidence`
4. Return summary statistics (% positive/negative/neutral)

---

## Frontend React Component Tree

```
App.js
├── Navbar (Layout component)
├── Routes
│   ├── HomePage (Step 0: Power BI-style start screen)
│   ├── UploadPage (Step 1: File upload)
│   ├── Dashboard (Step 2: Cleaning & review)
│   │   ├── UploadForm
│   │   ├── DataTable (raw preview)
│   │   ├── DataTable (cleaned preview)
│   │   ├── DataViewerModal (cell editing)
│   │   ├── HealthScoreCard
│   │   ├── QualityScorecardDisplay
│   │   ├── AnomalyReportDisplay
│   │   ├── FeatureEngineering
│   │   └── ReviewSection
│   │
│   ├── VisualizationPage (Step 3: Charts & insights)
│   │   ├── ChartContainer (renders Recharts)
│   │   ├── RecommendedCharts
│   │   ├── InsightsPanelModal
│   │   └── ExportOptions
│   │
│   └── ChatbotPage (Step 4: AI Q&A)
│       ├── ChatContainer
│       ├── ChatMessage
│       ├── ChatInput
│       ├── DataPreviewModal
│       └── ActionHistory
│
├── DataContext (Global state provider)
└── API Client (axios instance with interceptors)
```

**Route Guards:**
- Linear 4-step workflow enforced
- Attempting to skip phases redirects to appropriate step
- Confirmation prompt when going back to upload from later phases

---

## Data Flow Through System

### **End-to-End User Journey**

```
USER UPLOADS FILE
    ↓
[Upload Router] → Pandas parse → Health score compute → PostgreSQL save
    ↓
STATE UPDATE: sessionId, rawShape, rawHealthScore, dataPreview
    ↓
FRONTEND DISPLAYS: Raw preview + quality scorecard + anomaly report
    ↓
USER CLICKS "CLEAN"
    ↓
[Cleaning Router] → CleaningEngine → Apply strategies → Track changes → PostgreSQL save
    ↓
STATE UPDATE: cleanedShape, cleanedHealthScore, changeLog, cleaningReport
    ↓
FRONTEND DISPLAYS: Side-by-side preview (raw vs cleaned) + change log
    ↓
USER REVIEWS & APPROVES CHANGES
    ↓
[Review Endpoint] → Persist approval → Update session status
    ↓
USER CLICKS "VISUALIZE"
    ↓
[Visualization Router] → Load cleaned data → Generate charts → Compute insights
    ↓
STATE UPDATE: charts[], insights[]
    ↓
FRONTEND DISPLAYS: Recharts visualizations + text insights
    ↓
USER ASKS CHATBOT QUESTION
    ↓
[Chat Router] → Load context → LLM processing → Execute actions → MongoDB save
    ↓
STATE UPDATE: messages[], isProcessing=false
    ↓
FRONTEND DISPLAYS: Chat message + action results
    ↓
USER EXPORTS RESULTS
    ↓
[Export Endpoint] → Generate pipeline script + CSV files → Download
```

---

## Configuration Management

**File:** `backend/app/config.py`

**Settings (Pydantic BaseSettings):**

```python
# App Identity
app_name: str = "StatsFlow"
app_version: str = "1.0.0"
debug: bool = True

# Databases
database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/statsflow_db"
mongodb_url: str = "mongodb://localhost:27017"
mongodb_db_name: str = "statsflow_logs"

# LLM Providers
chat_provider: str = "groq"  # "groq" | "openai" | "gemini" | "anthropic" | "local" | "auto"
chat_model: str = "llama-3.3-70b-versatile"
chat_api_key: str = (from CHAT_API_KEY env var)
groq_api_key: str = (from GROQ_API_KEY env var)
openai_api_key: str = (from OPENAI_API_KEY env var)
gemini_api_key: str = (from GEMINI_API_KEY env var)

# File Handling
max_file_size_mb: int = 50
upload_dir: str = "uploads"

# CORS
allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
```

**Environment Variables (.env file):**
```
POSTGRESQL_URL=postgresql+asyncpg://...
MONGODB_URL=mongodb://...
GROQ_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
DEBUG=true
```

---

## Dependencies & Tech Stack

### **Backend**

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | FastAPI | 0.115.6 |
| **Server** | Uvicorn | 0.32.1 |
| **ORM** | SQLAlchemy | 2.0.36 |
| **Database Drivers** | asyncpg, aiosqlite | 0.30.0, 0.20.0 |
| **MongoDB** | motor, pymongo | 3.6.0, 4.9.2 |
| **Data Processing** | pandas, numpy, scikit-learn | 2.2.3, 2.2.5, 1.6.1 |
| **Sentiment** | TextBlob, NLTK | 0.17.1, 3.8.1 |
| **LLM APIs** | anthropic, openai, google-generativeai, langchain | 0.40.0, 1.58.1, 0.8.5, 0.3.12 |
| **Config** | pydantic, python-dotenv | 2.11.7, 1.0.1 |

### **Frontend**

| Layer | Technology |
|-------|------------|
| **Framework** | React 18+ |
| **Router** | React Router v6 |
| **HTTP Client** | Axios |
| **Charts** | Recharts, Plot.js |
| **Styling** | CSS + theme system |
| **State** | React Context API |
| **Notifications** | react-hot-toast |

---

## Error Handling & Resilience

### **Backend**

1. **Database Failures:**
   - PostgreSQL errors: logged, transaction rolled back
   - MongoDB unavailable: gracefully degrades (warning, no crash)

2. **File Operations:**
   - Upload size exceeded: 413 Payload Too Large
   - Invalid file format: 422 Unprocessable Entity
   - File not found: 404 Not Found

3. **LLM API Failures:**
   - API key missing: returns error details
   - Provider unavailable: falls back to next provider (if `chat_provider=auto`)
   - Timeout: 60-second timeout per LLM call

4. **Data Validation:**
   - Empty DataFrames rejected
   - Column count < 1 rejected
   - Invalid column types logged but processing continues

### **Frontend**

1. **Network Errors:**
   - Backend unreachable: "🔌 Cannot reach backend" toast
   - Server errors (5xx): Server error toast with message
   - Validation errors (422): Validation error toast with details
   - 404 errors: Handled by individual components

2. **State Guards:**
   - Route guards prevent skipping phases
   - Session validation before operations
   - Type checking on context data

3. **User Feedback:**
   - Toast notifications for errors/success
   - Loading spinners during async operations
   - Console logging for debugging

---

## Performance Considerations

1. **Backend:**
   - **Async/await**: All I/O operations non-blocking
   - **Connection pooling**: PgBouncer for PostgreSQL
   - **Lazy imports**: Heavy libraries (motor, anthropic) imported only when needed
   - **Streaming**: Large file uploads use chunked processing

2. **Frontend:**
   - **React Context API**: Minimal re-renders via useCallback
   - **Component memoization**: Prevent unnecessary re-renders
   - **Pagination**: Data tables paginated (not all rows rendered)
   - **Debouncing**: Cell edits debounced to prevent rapid API calls

3. **Data Processing:**
   - **Vectorized Pandas operations**: Avoid row-by-row loops
   - **Chunked sentiment analysis**: Process text in batches
   - **Incremental cleaning**: Stream cleaning operations to avoid memory overload

---

## Security Notes

1. **CORS Whitelist**: Only localhost:3000 and localhost:8000 allowed
2. **Secret Key**: Used for JWT/session tokens (if implemented)
3. **File Validation**: Extension and size checks on upload
4. **SQL Injection Prevention**: SQLAlchemy parameterized queries
5. **API Key Security**: Loaded from environment, not hardcoded
6. **Error Messages**: Sanitized to avoid exposing internal details

---

## Future Extensibility

1. **Multi-user Support**: Add authentication layer (JWT/OAuth)
2. **Cloud Storage**: Integrate AWS S3 / Azure Blob Storage
3. **Advanced Imputation**: Implement deep learning-based imputation
4. **Real-time Collaboration**: WebSocket support for shared sessions
5. **Export Formats**: Parquet, JSON, databases
6. **Scheduling**: Automated cleaning pipelines on schedule
7. **Model Versioning**: Track cleaning pipeline versions and rollback

---

## Summary

StatsFlow is a **full-stack data platform** with clear separation of concerns:

- **Frontend (React)**: Responsive UI with linear workflow enforcement
- **Backend (FastAPI)**: Async services with pluggable LLM providers
- **Data Layer**: PostgreSQL for structured data, MongoDB for logs, filesystem for datasets
- **Processing**: Statistically valid cleaning, AI-powered chatbot, rich visualizations
- **Scalability**: Async architecture with connection pooling, suitable for multi-user deployments

The architecture prioritizes **data quality**, **reproducibility** (via pipeline scripts), **human oversight** (review/approval workflows), and **AI augmentation** (LLM chatbot, feature engineering suggestions).
