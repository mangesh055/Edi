import os
import joblib
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import r2_score

from app.database import get_db
from app.models.postgres_models import DataSession
from app.config import settings

router = APIRouter(prefix="/api/sandbox", tags=["Predictive Sandbox"])

class TrainRequest(BaseModel):
    target_column: str
    model_type: str = "random_forest"

class PredictRequest(BaseModel):
    features: dict

def get_session_data(session_id: str, db: AsyncSession):
    # This is an async function context problem if we don't await. Let's do it in the endpoints.
    pass

@router.get("/{session_id}/features")
async def get_sandbox_features(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataSession).where(DataSession.session_id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    cleaned_path = session.approved_file_path or session.cleaned_file_path
    if not cleaned_path or not os.path.exists(cleaned_path):
        raise HTTPException(status_code=404, detail="Data file not found")
        
    df = pd.read_csv(cleaned_path)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    return {
        "success": True,
        "numeric_columns": numeric_cols,
        "all_columns": df.columns.tolist()
    }

@router.post("/{session_id}/train")
async def train_sandbox_model(session_id: str, req: TrainRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataSession).where(DataSession.session_id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    cleaned_path = session.approved_file_path or session.cleaned_file_path
    df = pd.read_csv(cleaned_path)
    
    target = req.target_column
    if target not in df.columns:
        raise HTTPException(status_code=400, detail="Target column not found in dataset")
        
    if not pd.api.types.is_numeric_dtype(df[target]):
        raise HTTPException(status_code=400, detail="Target column must be numeric for regression")
        
    # Drop rows with missing target
    df = df.dropna(subset=[target])
    
    # Select numeric features
    features = df.select_dtypes(include=[np.number]).drop(columns=[target])
    # Fill missing feature values with mean
    features = features.fillna(features.mean())
    
    if features.empty:
        raise HTTPException(status_code=400, detail="No numeric features available to train the model")
        
    # Train
    X = features
    y = df[target]
    
    if req.model_type == "linear_regression":
        model = LinearRegression()
    elif req.model_type == "decision_tree":
        model = DecisionTreeRegressor(max_depth=5, random_state=42)
    elif req.model_type == "gradient_boosting":
        model = GradientBoostingRegressor(n_estimators=50, random_state=42)
    else:
        model = RandomForestRegressor(n_estimators=50, random_state=42)
        
    model.fit(X, y)
    
    # Calculate feature importances
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    elif hasattr(model, "coef_"):
        # For linear regression, use absolute coefficients
        importances = np.abs(model.coef_)
    else:
        importances = np.zeros(X.shape[1])
        
    feature_imp = {feat: float(imp) for feat, imp in zip(X.columns, importances)}
    # Sort
    feature_imp = dict(sorted(feature_imp.items(), key=lambda item: item[1], reverse=True))
    
    # Baseline metrics
    r2 = r2_score(y, model.predict(X))
    baseline = float(y.mean())
    
    # Save model and meta
    model_path = os.path.join(settings.upload_dir, f"{session_id}_sandbox_model.joblib")
    meta_path = os.path.join(settings.upload_dir, f"{session_id}_sandbox_meta.joblib")
    
    joblib.dump(model, model_path)
    joblib.dump({
        "features": list(X.columns),
        "target": target,
        "feature_means": features.mean().to_dict(),
        "baseline": baseline
    }, meta_path)
    
    return {
        "success": True,
        "r2_score": r2,
        "baseline": baseline,
        "feature_importances": feature_imp,
        "feature_means": features.mean().to_dict()
    }

@router.post("/{session_id}/predict")
async def predict_sandbox(session_id: str, req: PredictRequest):
    model_path = os.path.join(settings.upload_dir, f"{session_id}_sandbox_model.joblib")
    meta_path = os.path.join(settings.upload_dir, f"{session_id}_sandbox_meta.joblib")
    
    if not os.path.exists(model_path) or not os.path.exists(meta_path):
        raise HTTPException(status_code=400, detail="Model not trained yet")
        
    model = joblib.load(model_path)
    meta = joblib.load(meta_path)
    
    # Build input df
    input_data = {}
    for f in meta["features"]:
        # If user provided a new value, use it. Otherwise use the mean.
        val = req.features.get(f)
        if val is not None:
            input_data[f] = [float(val)]
        else:
            input_data[f] = [meta["feature_means"][f]]
            
    input_df = pd.DataFrame(input_data)[meta["features"]]
    prediction = model.predict(input_df)[0]
    
    return {
        "success": True,
        "prediction": float(prediction),
        "target": meta["target"],
        "baseline": meta["baseline"]
    }
