import json
import numpy as np
import os

# Generate 4 cognitive states
states = ["focus", "relaxed", "stressed", "sleep"]

# Frequencies for each state
params = {
    "focus": {"alpha": 0.5, "beta": 1.2, "theta": 0.2, "noise": 0.1},
    "relaxed": {"alpha": 1.5, "beta": 0.3, "theta": 0.4, "noise": 0.05},
    "stressed": {"alpha": 0.2, "beta": 1.8, "theta": 0.6, "noise": 0.3},
    "sleep": {"alpha": 0.1, "beta": 0.1, "theta": 1.5, "noise": 0.05},
}

sample_rate = 256
duration_sec = 10
channels_count = 8
num_samples = sample_rate * duration_sec

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_dir = os.path.join(base_dir, "sample_sessions")
os.makedirs(out_dir, exist_ok=True)

t = np.linspace(0, duration_sec, num_samples, endpoint=False)

def generate_channel_data(state):
    p = params[state]
    alpha_wave = p["alpha"] * np.sin(2 * np.pi * 10 * t)
    beta_wave = p["beta"] * np.sin(2 * np.pi * 20 * t)
    theta_wave = p["theta"] * np.sin(2 * np.pi * 6 * t)
    noise = np.random.normal(0, p["noise"], num_samples)
    return alpha_wave + beta_wave + theta_wave + noise

for state in states:
    label = f"{state}_001"
    data = {}
    for ch in range(1, channels_count + 1):
        data[f"ch{ch}"] = (generate_channel_data(state) * np.random.uniform(0.8, 1.2)).tolist()
        
    session = {
        "session_id": f"sess_{np.random.randint(1000, 9999)}",
        "label": label,
        "cognitive_state": state,
        "duration_sec": duration_sec,
        "sample_rate": sample_rate,
        "channels": channels_count,
        "data": data
    }
    
    out_path = os.path.join(out_dir, f"{label}.json")
    with open(out_path, "w") as f:
        json.dump(session, f)
    print(f"Generated {out_path}")
