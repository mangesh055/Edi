import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getSandboxFeatures, trainSandbox, predictSandbox } from '../../api/api';
import './Visualizations.css';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35 } }),
};

function PredictiveSandbox({ sessionId }) {
  const [loading, setLoading] = useState(true);
  const [featuresData, setFeaturesData] = useState(null);
  
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedModel, setSelectedModel] = useState('random_forest');
  const [isTraining, setIsTraining] = useState(false);
  const [modelMeta, setModelMeta] = useState(null);
  
  const [sliderValues, setSliderValues] = useState({});
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const loadFeatures = useCallback(async () => {
    try {
      const res = await getSandboxFeatures(sessionId);
      if (res.success) {
        setFeaturesData(res);
        if (res.numeric_columns && res.numeric_columns.length > 0) {
          setSelectedTarget(res.numeric_columns[res.numeric_columns.length - 1]);
        }
      }
    } catch (err) {
      toast.error('Failed to load sandbox features.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) loadFeatures();
  }, [sessionId, loadFeatures]);

  const handleTrain = async () => {
    if (!selectedTarget) return;
    setIsTraining(true);
    const modelName = selectedModel.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const tid = toast.loading(`Training ${modelName} on ${selectedTarget}...`);
    try {
      const res = await trainSandbox(sessionId, selectedTarget, selectedModel);
      if (res.success) {
        setModelMeta(res);
        setSliderValues(res.feature_means);
        setCurrentPrediction(res.baseline);
        toast.success(`Model Trained! R² Score: ${res.r2_score.toFixed(3)}`, { id: tid });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Training failed.', { id: tid });
    } finally {
      setIsTraining(false);
    }
  };

  const handlePredict = useCallback(async (newFeatures) => {
    setIsPredicting(true);
    try {
      const res = await predictSandbox(sessionId, newFeatures);
      if (res.success) {
        setCurrentPrediction(res.prediction);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPredicting(false);
    }
  }, [sessionId]);

  const handleSliderChange = (feature, value) => {
    const numVal = parseFloat(value);
    const newValues = { ...sliderValues, [feature]: numVal };
    setSliderValues(newValues);
    handlePredict(newValues);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading Sandbox...</div>;

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🔮 Predictive Causal Sandbox</h3>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
          Select a target variable to predict. We will train a Machine Learning model in the background and allow you to tweak the features to simulate "What-If" scenarios.
        </p>

        {!modelMeta ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                Target Variable (What do you want to predict?)
              </label>
              <select 
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                {featuresData?.numeric_columns.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                Model Type
              </label>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="linear_regression">Linear Regression</option>
                <option value="decision_tree">Decision Tree Regressor</option>
                <option value="gradient_boosting">Gradient Boosting Regressor</option>
                <option value="random_forest">Random Forest Regressor</option>
              </select>
            </div>
            <button 
              onClick={handleTrain} 
              disabled={isTraining || !selectedTarget}
              style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', opacity: isTraining ? 0.7 : 1 }}
            >
              {isTraining ? 'Training Model...' : 'Train ML Model'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            {/* Features Panel */}
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ margin: 0, color: '#0f172a' }}>Adjust Features</h4>
                <button 
                  onClick={() => setModelMeta(null)} 
                  style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  Change Target
                </button>
              </div>

              {Object.entries(modelMeta.feature_importances).map(([feature, importance]) => {
                const meanVal = modelMeta.feature_means[feature];
                const currentVal = sliderValues[feature] ?? meanVal;
                // Calculate reasonable min/max based on mean
                const min = meanVal > 0 ? 0 : meanVal * 2;
                const max = meanVal > 0 ? meanVal * 3 : Math.abs(meanVal * 2) || 100;
                
                return (
                  <div key={feature} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>
                        {feature} 
                        {importance > 0.1 && <span style={{ color: '#f59e0b', marginLeft: 4 }} title="High Importance Feature">⭐</span>}
                      </span>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>{currentVal.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      min={min} 
                      max={max} 
                      step={(max - min) / 100}
                      value={currentVal}
                      onChange={(e) => handleSliderChange(feature, e.target.value)}
                      style={{ width: '100%', accentColor: '#6366f1' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      <span>{min.toFixed(0)}</span>
                      <span>{max.toFixed(0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Prediction Panel */}
            <div style={{ width: '300px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: 14 }}>Predicted {selectedTarget}</h4>
              <div style={{ fontSize: 42, fontWeight: 800, color: '#0f172a', transition: 'color 0.3s' }}>
                {currentPrediction !== null ? currentPrediction.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
              </div>
              
              {currentPrediction !== null && (
                <div style={{ marginTop: 16, fontSize: 13, color: currentPrediction >= modelMeta.baseline ? '#10b981' : '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {currentPrediction >= modelMeta.baseline ? '↗' : '↘'}
                  {Math.abs(((currentPrediction - modelMeta.baseline) / (modelMeta.baseline || 1)) * 100).toFixed(1)}% vs baseline
                </div>
              )}
              
              <div style={{ marginTop: 'auto', paddingTop: 20, fontSize: 11, color: '#94a3b8' }}>
                Model R²: {modelMeta.r2_score.toFixed(3)}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default PredictiveSandbox;
