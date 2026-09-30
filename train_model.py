# ======================================================
# THINKTRACK JOURNAL - MOOD BASED AI MODEL
# ======================================================

from sklearn.tree import DecisionTreeClassifier
import joblib


# ------------------------------------------------------
# TRAINING DATA
# ------------------------------------------------------
# Mood values:
# 1 = Angry
# 2 = Sad
# 3 = Tired
# 4 = Calm
# 5 = Happy
# 6 = Loved
#
# AI input = MOOD ONLY

X = [
    [1],
    [1],
    [2],
    [2],
    [3],
    [3],
    [4],
    [4],
    [5],
    [5],
    [6],
    [6]
]


# 0 = Needs Care
# 1 = Normal
# 2 = Good

y = [
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2
]


# ------------------------------------------------------
# CREATE DECISION TREE
# ------------------------------------------------------

model = DecisionTreeClassifier(
    max_depth=3,
    random_state=42
)


# ------------------------------------------------------
# TRAIN MODEL
# ------------------------------------------------------

model.fit(X, y)


# ------------------------------------------------------
# SAVE MODEL
# ------------------------------------------------------

joblib.dump(model, "thinktrack_model.pkl")


print("================================")
print("ThinkTrack Mood AI Model Trained!")
print("================================")
print("Input: Mood only")
print("Output: Needs Care / Normal / Good")
print("Model saved as: thinktrack_model.pkl")
print("AI is ready!")