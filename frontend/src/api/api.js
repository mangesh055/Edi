/**
 * StatsFlow API Client
 * ----------------------
 * Centralized Axios-based API client.
 * Uses relative URLs so Create React App proxy forwards
 * all /api/* requests to the FastAPI backend on port 8000.
 */

import axios from 'axios';
import toast from 'react-hot-toast';

// ── Base Instance ────────────────────────────────────────────────
// baseURL is intentionally empty string so all requests use
// relative paths like /api/upload
// CRA proxy (set in package.json) forwards them to localhost:8000
const api = axios.create({
  baseURL: '',
  timeout: 120000, // 2 minutes — LLM responses can be slow
  headers: {
    'Accept': 'application/json',
  },
});

// ── Request Interceptor ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ─────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    console.log(`[API] ✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`[API] ❌ Error:`, error.message);

    if (!error.response) {
      // Network error — backend not reachable
      toast.error(
        '🔌 Cannot reach the backend server. Make sure it is running on port 8000.',
        { duration: 6000 }
      );
      return Promise.reject(error);
    }

    const status  = error.response?.status;
    const message = error.response?.data?.detail ||
                    error.response?.data?.message ||
                    error.message ||
                    'An unexpected error occurred';

    if (status >= 500) {
      toast.error(`Server error: ${message}`);
    } else if (status === 422) {
      toast.error(`Validation error: ${message}`);
    } else if (status === 404) {
      // 404s handled by individual components
    }

    return Promise.reject(error);
  }
);


// ── API Functions ────────────────────────────────────────────────

/**
 * Phase 1: Upload a raw dataset file.
 */
export const uploadDataset = async (file, onProgress, userId) => {
  const formData = new FormData();
  formData.append('file', file);
  if (userId) {
    formData.append('user_id', userId);
  }

  const response = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const pct = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(pct);
      }
    },
  });

  return response.data;
};

/**
 * Connect to a Live Database
 */
export const connectDatabase = async (connectionString, query, name, userId) => {
  const response = await api.post('/api/db-connect', {
    connection_string: connectionString,
    query: query,
    name: name,
    user_id: userId
  });
  return response.data;
};

/**
 * Get session details
 */
export const getSession = async (sessionId) => {
  const response = await api.get(`/api/session/${sessionId}`);
  return response.data;
};

/**
 * Get recent sessions
 */
export const getRecentSessions = async (userId) => {
  const params = userId ? { user_id: userId } : {};
  const response = await api.get('/api/sessions/recent', { params });
  return response.data;
};


/**
 * Phase 2: Run automated cleaning pipeline.
 */
export const cleanDataset = async (
  sessionId,
  missingStrategy = 'auto',
  outlierStrategy = 'auto'
) => {
  const response = await api.post(`/api/clean/${sessionId}`, {
    missing_strategy: missingStrategy,
    outlier_strategy: outlierStrategy,
  });
  return response.data;
};


/**
 * Phase 2: Update a single cell in the cleaned dataset.
 */
export const editCleanedCell = async (sessionId, rowIndex, column, value) => {
  const response = await api.post(`/api/clean/${sessionId}/edit`, {
    row_index: rowIndex,
    column,
    value,
  });
  return response.data;
};


/**
 * Phase 2 review: fetch current review state and change log.
 */
export const getReviewState = async (sessionId) => {
  const response = await api.get(`/api/clean/${sessionId}/review`);
  return response.data;
};


/**
 * Get session-level quality scorecard and anomaly report.
 */
export const getSessionQuality = async (sessionId) => {
  const response = await api.get(`/api/quality/session/${sessionId}`);
  return response.data;
};


/**
 * Get feed-level quality aggregates.
 */
export const getFeedQualitySummary = async (limit = 10) => {
  const response = await api.get('/api/quality/feeds', {
    params: { limit },
  });
  return response.data;
};


/**
 * Phase 2 review: submit user feedback and review decisions.
 */
export const submitCleaningFeedback = async (sessionId, payload) => {
  const response = await api.post(`/api/clean/${sessionId}/feedback`, payload);
  return response.data;
};


/**
 * Phase 2 review: revert selected changes.
 */
export const revertSelectedChanges = async (sessionId, changeIds) => {
  const response = await api.post(`/api/clean/${sessionId}/revert`, {
    change_ids: changeIds,
  });
  return response.data;
};


/**
 * Phase 2 review: finalize and lock approved cleaned dataset.
 */
export const finalizeCleanedDataset = async (sessionId, notes = '') => {
  const response = await api.post(`/api/clean/${sessionId}/finalize`, {
    notes,
  });
  return response.data;
};


/**
 * Download the cleaned dataset as CSV.
 */
export const downloadCleanedDataset = async (
  sessionId,
  filename = null
) => {
  const response = await api.get(`/api/clean/${sessionId}/download`, {
    responseType: 'blob',
  });

  const basename = filename || `cleaned_data_${sessionId.substring(0, 8)}.csv`;
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', basename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};


/**
 * Phase 3: Get chart data and AI-generated insights.
 */
export const getVisualizations = async (sessionId) => {
  const response = await api.get(`/api/visualize/${sessionId}`);
  return response.data;
};

/**
 * Text-to-Dashboard Dynamic Generation
 */
export const generateAiDashboard = async (sessionId, prompt) => {
  const response = await api.post(`/api/dashboard-ai/generate`, {
    session_id: sessionId,
    prompt: prompt,
  });
  return response.data;
};

export const refreshAiDashboard = async (sessionId, charts) => {
  const response = await api.post(`/api/dashboard-ai/refresh`, {
    session_id: sessionId,
    charts: charts,
  });
  return response.data;
};

/**
 * Phase 3: Predictive Sandbox (Causal AI)
 */
export const getSandboxFeatures = async (sessionId) => {
  const response = await api.get(`/api/sandbox/${sessionId}/features`);
  return response.data;
};

export const trainSandbox = async (sessionId, targetColumn, modelType = "random_forest") => {
  const response = await api.post(`/api/sandbox/${sessionId}/train`, {
    target_column: targetColumn,
    model_type: modelType
  });
  return response.data;
};

export const predictSandbox = async (sessionId, features) => {
  const response = await api.post(`/api/sandbox/${sessionId}/predict`, {
    features: features,
  });
  return response.data;
};

export const executePythonCode = async (sessionId, code) => {
  const response = await api.post(`/api/python-runner/execute`, {
    session_id: sessionId,
    code: code,
  });
  return response.data;
};

export const saveSandboxCode = async (sessionId, code) => {
  const response = await api.post(`/api/python-runner/code`, {
    session_id: sessionId,
    code: code,
  });
  return response.data;
};

export const getSandboxCode = async (sessionId) => {
  const response = await api.get(`/api/python-runner/code/${sessionId}`);
  return response.data;
};

export const generateCopilotCode = async (sessionId, prompt, currentCode) => {
  const response = await api.post(`/api/python-runner/copilot`, {
    session_id: sessionId,
    prompt: prompt,
    current_code: currentCode
  });
  return response.data;
};


/**
 * Phase 4: Send a chat message to the AI chatbot.
 */
export const sendChatMessage = async (sessionId, message, history = [], threadId = 'default') => {
  const payload = {
    message,
    history,
    thread_id: threadId,
  };
  const response = await api.post(`/api/chat/${sessionId}`, payload);
  return response.data;
};


/**
 * Get full chat history for a session.
 */
export const getChatHistory = async (sessionId) => {
  const response = await api.get(`/api/chat/${sessionId}/history`);
  return response.data;
};

export const getVersions = async (sessionId) => {
  const response = await api.get(`/api/chat/${sessionId}/versions`);
  return response.data;
};

export const rollbackVersion = async (sessionId, filename) => {
  const response = await api.post(`/api/chat/${sessionId}/rollback`, {
    filename: filename
  });
  return response.data;
};

export const joinDataset = async (sessionId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/api/chat/${sessionId}/join`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};


/**
 * Download the auto-generated Python cleaning pipeline script.
 */
export const downloadPipeline = async (
  sessionId,
  filename = 'cleaning_pipeline.py'
) => {
  const response = await api.get(`/api/export/${sessionId}`, {
    responseType: 'blob',
  });

  const url  = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href  = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};


/**
 * Commit a manual version snapshot of the current cleaned dataset.
 */
export const commitDatasetVersion = async (sessionId, message) => {
  const response = await api.post(`/api/chat/${sessionId}/commit`, { message });
  return response.data;
};

/**
 * List all saved versions for a session.
 */
export const getDatasetVersions = async (sessionId) => {
  const response = await api.get(`/api/chat/${sessionId}/versions`);
  return response.data;
};

/**
 * Rollback the cleaned dataset to a specific version.
 */
export const rollbackDatasetVersion = async (sessionId, filename) => {
  const response = await api.post(`/api/chat/${sessionId}/rollback`, { filename });
  return response.data;
};

/**
 * Fetch a specific page of dataset rows from the server.
 * Supports both "cleaned" and "raw" datasets.
 * @param {string} sessionId
 * @param {number} page        - 0-based page index
 * @param {number} pageSize    - rows per page (max 1000)
 * @param {string} dataset     - "cleaned" or "raw"
 */
export const getPagedData = async (sessionId, page = 0, pageSize = 100, dataset = 'cleaned') => {
  const response = await api.get(`/api/clean/${sessionId}/data`, {
    params: { page, page_size: pageSize, dataset },
  });
  return response.data;
};

/**
 * Feature Engineering: ask AI to suggest new features.
 */
export const suggestFeatures = async (sessionId) => {
  const response = await api.get(`/api/clean/${sessionId}/feature-engineering/suggest`);
  return response.data;
};

/**
 * Feature Engineering: apply selected features to the cleaned dataset.
 */
export const applyFeatures = async (sessionId, selectedFeatures) => {
  const response = await api.post(`/api/clean/${sessionId}/feature-engineering/apply`, {
    selected_features: selectedFeatures,
  });
  return response.data;
};

/**
 * Sentiment Analysis: get identified text columns for sentiment analysis.
 */
export const getTextColumns = async (sessionId) => {
  const response = await api.get(`/api/sentiment/text-columns/${sessionId}`);
  return response.data;
};

/**
 * Sentiment Analysis: analyze sentiment for specified text columns.
 */
export const analyzeSentiment = async (sessionId, columns = null) => {
  const response = await api.post(`/api/sentiment/analyze`, {
    session_id: sessionId,
    columns: columns,
  });
  return response.data;
};

/**
 * Sentiment Analysis: get sentiment summary for a session or specific column.
 */
export const getSentimentSummary = async (sessionId, columnName = null) => {
  const params = columnName ? { column_name: columnName } : {};
  const response = await api.get(`/api/sentiment/summary/${sessionId}`, { params });
  return response.data;
};

/**
 * Sentiment Analysis: analyze sentiment for a single text string.
 */
export const analyzeSingleText = async (text) => {
  const response = await api.post(`/api/sentiment/single`, { text });
  return response.data;
};

/**
 * Sentiment Analysis: get detailed sentiment analysis with AI insights.
 */
export const getDetailedSentimentAnalysis = async (sessionId, columnName = null, sentimentType = null) => {
  const params = {};
  if (columnName) params.column_name = columnName;
  if (sentimentType) params.sentiment_type = sentimentType;
  const response = await api.get(`/api/sentiment/detailed/${sessionId}`, { params });
  return response.data;
};

export default api;

