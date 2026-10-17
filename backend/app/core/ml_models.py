import joblib


MODEL_PATH = "app/models/ml_models/"

model = None
scaler = None
feature_names = None
label_encoder = None


def load_models() -> None:
    global model, scaler, feature_names, label_encoder

    try:
        model = joblib.load(f"{MODEL_PATH}best_model.pkl")
        scaler = joblib.load(f"{MODEL_PATH}scaler_selected.pkl")
        feature_names = joblib.load(f"{MODEL_PATH}selected_features.pkl")
        label_encoder = joblib.load(f"{MODEL_PATH}label_encoder.pkl")
        print("✅ ML Models loaded successfully!")
    except Exception as e:
        print(f"⚠️ Error loading models: {e}")
        model = None
        scaler = None
        feature_names = None
        label_encoder = None


def is_model_loaded() -> bool:
    return model is not None


load_models()
