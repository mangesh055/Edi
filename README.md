# StatsFlow - AI-Enabled Data Processing Platform

Welcome to **StatsFlow**, a full-stack, AI-driven data processing and analytics platform. StatsFlow automates the tedious processes of data cleaning, provides rich interactive visualizations, and incorporates an agentic AI chatbot to help you converse with your data. 

Whether you are a data scientist looking to speed up preprocessing or a business analyst needing quick insights without coding, StatsFlow provides a seamless, intuitive 4-phase workflow to transform raw data into actionable intelligence.

---

## 🎯 Problem Statement

Data scientists and analysts spend up to **80% of their time cleaning and organizing data** before they can even begin extracting insights or building models. 
* **Traditional Spreadsheets** are highly manual, error-prone, and struggle with large datasets.
* **Code Notebooks (Jupyter/Pandas)** require programming expertise and significant time to write boilerplate code.
* **General AI Tools** lack the structured user interface needed to visually review and approve cell-level data imputations.

## 💡 The Solution

**StatsFlow** bridges this gap by providing an end-to-end, no-code graphical interface that automatically cleans data, scores its quality, and visualizes it. It empowers users with:
1. **Automated Cleaning:** Statistically sound strategies for missing values and outliers.
2. **Human-in-the-Loop Review:** Visually approve or revert AI-driven changes.
3. **Agentic Chatbot:** Transform and query your data using natural language.
4. **Code Export:** Automatically generate the underlying Python pipeline script for reproducibility.

---

## ✨ Key Features

* 📊 **Data Health Scoring:** Automatically grades your dataset (0-100) based on completeness, uniqueness, consistency, and outliers.
* 🧹 **Automated & Configurable Cleaning:** Choose from multiple strategies (Mean, Median, Mode, KNN, AI-Impute) for missing data and (Z-Score, IQR) for outliers.
* 👁️ **Human-in-the-Loop Validation:** Side-by-side preview of raw vs. cleaned data with the ability to manually edit cells before approval.
* 📈 **Automated Visualizations:** Instantly generates histograms, bar charts, box plots, scatter plots, and correlation heatmaps.
* 🤖 **Agentic AI Chatbot:** Chat with your data using LLMs (Groq, OpenAI, Gemini, Claude). Ask questions, create new features, filter rows, or rename columns via natural language.
* 📝 **Reproducible Pipelines:** Export the exact Python code used to clean your data.
* 🎭 **Sentiment Analysis:** Automatically analyzes text columns to determine sentiment polarity.

---

## 🚀 The 4-Phase Methodology (Pipeline Tasks)

StatsFlow enforces a linear, structured workflow to ensure data integrity at every step.

### Phase 1: Upload (Data Ingestion)
* **Action:** You upload a CSV or Excel file.
* **Process:** The backend parses the file using Pandas, calculates a preliminary Data Health Score, detects column data types, and scans for anomalies.
* **Output:** A preview of your raw data, a detailed quality scorecard, and database session creation.

### Phase 2: Cleaning (Automated & Human-in-the-Loop)
* **Action:** You select your preferred cleaning strategies and run the engine.
* **Process:** The system applies statistical methods to handle missing values and outliers. It logs every single operation and calculates a new, post-cleaning Health Score.
* **Output:** A visual comparison of raw vs. cleaned data. You can review the change log, edit individual cells, revert specific actions, and finally "Approve" the dataset.

### Phase 3: Visualizations & Insights
* **Action:** You navigate to the visual dashboard.
* **Process:** The system analyzes the approved data structure and automatically generates the most appropriate charts and statistical insights.
* **Output:** Interactive Recharts/Plot.js charts (distributions, correlations, category breakdowns) and text-based AI observations.

### Phase 4: Chatbot (Agentic Q&A)
* **Action:** You interact with the AI assistant via chat.
* **Process:** The system injects your dataset schema, statistics, and conversation history into an LLM. The AI can answer questions or execute structural actions (e.g., dropping rows, filling values).
* **Output:** Natural language responses and a dynamically updated working copy of your dataset.

---

## 🆚 Comparison with Alternatives

| Feature | StatsFlow | Spreadsheets (Excel) | Jupyter Notebooks | Traditional BI (Tableau) |
|---------|-----------|----------------------|-------------------|--------------------------|
| **No-Code Interface** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Automated Cleaning**| ✅ Yes | ❌ No (Manual) | ✅ Yes (Requires Code) | ❌ No (Requires pre-cleaning) |
| **Human-in-the-Loop** | ✅ Yes (Cell Review) | ✅ Yes | ❌ No | ❌ No |
| **Agentic AI Chat** | ✅ Yes (Action-driven)| ❌ No | ❌ No | ⚠️ Limited (Q&A only) |
| **Reproducible Code** | ✅ Yes (Exports Script)| ❌ No | ✅ Yes | ❌ No |

---

## 🛠️ System Architecture

* **Frontend:** React.js, React Context API, React Router, Recharts, Axios.
* **Backend:** FastAPI (Python), Pandas, Scikit-learn, SQLAlchemy, TextBlob.
* **Databases:** PostgreSQL (Relational session metadata), MongoDB (Optional, for chat history & logs).
* **AI Integrations:** Groq, OpenAI, Google Gemini, Anthropic.

---

## ❓ Frequently Asked Questions (FAQs)

**Q: Do I need to know Python to use StatsFlow?**
A: Not at all! StatsFlow is designed with a completely graphical interface. However, if you are a developer, you can export the generated Python code to use elsewhere.

**Q: What file formats are supported?**
A: Currently, StatsFlow supports `.csv`, `.xlsx`, and `.xls` files up to 50MB.

**Q: Can I undo a cleaning operation?**
A: Yes! During Phase 2 (Cleaning), you are presented with a review screen. You can revert specific automated changes or manually edit cells before finalizing.

**Q: Which AI models power the chatbot?**
A: The system is pluggable. By default, it uses Groq for blazing-fast inference (Llama 3), but you can easily configure it to use OpenAI (GPT-4), Gemini, or Claude via the `.env` file.

**Q: Is my data safe?**
A: Data processing happens on your hosted backend. Sessions are tracked via PostgreSQL, and original files are securely stored in the local file system.

---

## 💻 Local Setup & Installation

1. **Clone the Repository**
2. **Backend Setup:**
   ```bash
   cd backend
   pip install -r requirements.txt
   # Set up your .env file with database URLs and API Keys (Groq/OpenAI)
   uvicorn app.main:app --reload --port 8000
   ```
3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm start # Runs on port 3000
   ```
4. **Access the App:** Open `http://localhost:3000` in your browser.
