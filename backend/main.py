from fastapi import FastAPI, HTTPException, Query, Body
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI()

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 数据定义
# ==========================================

MUSIC_DATA = {
    # 升号调
    "C": {"minor": "a", "sig": "0", "notes": ["C", "D", "E", "F", "G", "A", "B"]},
    "G": {"minor": "e", "sig": "1#", "notes": ["G", "A", "B", "C", "D", "E", "F#"]},
    "D": {"minor": "b", "sig": "2#", "notes": ["D", "E", "F#", "G", "A", "B", "C#"]},
    "A": {"minor": "f#", "sig": "3#", "notes": ["A", "B", "C#", "D", "E", "F#", "G#"]},
    "E": {"minor": "c#", "sig": "4#", "notes": ["E", "F#", "G#", "A", "B", "C#", "D#"]},
    "B": {"minor": "g#", "sig": "5#", "notes": ["B", "C#", "D#", "E", "F#", "G#", "A#"]},
    "F#": {"minor": "d#", "sig": "6#", "notes": ["F#", "G#", "A#", "B", "C#", "D#", "E#"]},
    "C#": {"minor": "a#", "sig": "7#", "notes": ["C#", "D#", "E#", "F#", "G#", "A#", "B#"]},
    # 降号调
    "F": {"minor": "d", "sig": "1b", "notes": ["F", "G", "A", "Bb", "C", "D", "E"]},
    "Bb": {"minor": "g", "sig": "2b", "notes": ["Bb", "C", "D", "Eb", "F", "G", "A"]},
    "Eb": {"minor": "c", "sig": "3b", "notes": ["Eb", "F", "G", "Ab", "Bb", "C", "D"]},
    "Ab": {"minor": "f", "sig": "4b", "notes": ["Ab", "Bb", "C", "Db", "Eb", "F", "G"]},
    "Db": {"minor": "bb", "sig": "5b", "notes": ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"]},
    "Gb": {"minor": "eb", "sig": "6b", "notes": ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"]},
    "Cb": {"minor": "ab", "sig": "7b", "notes": ["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"]},
}

# 基础和弦类型 (用于调性分析)
TRIAD_TYPES = [
    {"degree": "I", "type": "Major", "indexes": [0, 2, 4]},
    {"degree": "ii", "type": "minor", "indexes": [1, 3, 5]},
    {"degree": "iii", "type": "minor", "indexes": [2, 4, 6]},
    {"degree": "IV", "type": "Major", "indexes": [3, 5, 0]},
    {"degree": "V", "type": "Major", "indexes": [4, 6, 1]},
    {"degree": "vi", "type": "minor", "indexes": [5, 0, 2]},
    {"degree": "vii°", "type": "diminished", "indexes": [6, 1, 3]},
]

SEVENTH_TYPES = [
    {"degree": "Imaj7", "type": "Major 7th", "indexes": [0, 2, 4, 6]},
    {"degree": "ii7", "type": "minor 7th", "indexes": [1, 3, 5, 0]},
    {"degree": "iii7", "type": "minor 7th", "indexes": [2, 4, 6, 1]},
    {"degree": "IVmaj7", "type": "Major 7th", "indexes": [3, 5, 0, 2]},
    {"degree": "V7", "type": "Dominant 7th", "indexes": [4, 6, 1, 3]},
    {"degree": "vi7", "type": "minor 7th", "indexes": [5, 0, 2, 4]},
    {"degree": "viiø7", "type": "Half-diminished 7th", "indexes": [6, 1, 3, 5]},
]

# 和弦走向模板
PROGRESSION_TEMPLATES = [
    {"name": "Pop Standard (1-6-4-5)", "numerals": ["I", "vi", "IV", "V"]},
    {"name": "Pop Ballad (1-5-6-4)", "numerals": ["I", "V", "vi", "IV"]},
    {"name": "Jazz 2-5-1 (ii-V-I)", "numerals": ["ii7", "V7", "Imaj7"]},
    {"name": "Canon (卡农)", "numerals": ["I", "V", "vi", "iii", "IV", "I", "IV", "V"]},
    {"name": "Blues 12-Bar", "numerals": ["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "V7"]},
    {"name": "J-Pop Royal (4-5-3-6)", "numerals": ["IV", "V", "iii", "vi"]},
    {"name": "Epic/Anime (6-4-5-1)", "numerals": ["vi", "IV", "V", "I"]},
]

# 通用和弦公式字典
ALL_CHORD_FORMULAS = {
    # Triads
    "Major": {"intervals": [0, 4, 7], "latex_suffix": ""},
    "minor": {"intervals": [0, 3, 7], "latex_suffix": "\\text{m}"},
    "diminished": {"intervals": [0, 3, 6], "latex_suffix": "\\text{dim}"},
    "augmented": {"intervals": [0, 4, 8], "latex_suffix": "\\text{aug}"},
    "sus2": {"intervals": [0, 2, 7], "latex_suffix": "\\text{sus2}"},
    "sus4": {"intervals": [0, 5, 7], "latex_suffix": "\\text{sus4}"},
    
    # Sixth
    "6": {"intervals": [0, 4, 7, 9], "latex_suffix": "^6"},
    "m6": {"intervals": [0, 3, 7, 9], "latex_suffix": "\\text{m}^6"},
    
    # Seventh
    "7": {"intervals": [0, 4, 7, 10], "latex_suffix": "^7"}, # Dominant 7
    "Dom7": {"intervals": [0, 4, 7, 10], "latex_suffix": "^7"},
    "maj7": {"intervals": [0, 4, 7, 11], "latex_suffix": "\\text{maj}^7"},
    "m7": {"intervals": [0, 3, 7, 10], "latex_suffix": "\\text{m}^7"},
    "mM7": {"intervals": [0, 3, 7, 11], "latex_suffix": "\\text{mM}^7"},
    "dim7": {"intervals": [0, 3, 6, 9], "latex_suffix": "\\text{dim}^7"},
    "m7b5": {"intervals": [0, 3, 6, 10], "latex_suffix": "\\text{m}^{7\\flat5}"},
    "7sus4": {"intervals": [0, 5, 7, 10], "latex_suffix": "^7\\text{sus4}"},
    
    # Extended
    "9": {"intervals": [0, 4, 7, 10, 14], "latex_suffix": "^9"},
    "maj9": {"intervals": [0, 4, 7, 11, 14], "latex_suffix": "\\text{maj}^9"},
    "m9": {"intervals": [0, 3, 7, 10, 14], "latex_suffix": "\\text{m}^9"},
    "add9": {"intervals": [0, 4, 7, 14], "latex_suffix": "\\text{add9}"},
    "7#9": {"intervals": [0, 4, 7, 10, 15], "latex_suffix": "^{7\\sharp9}"},
}

# 音高映射
CHROMATIC_SCALE_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
CHROMATIC_SCALE_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
NOTE_TO_INT = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11, 'B#': 0
}

# 罗马数字解析 (简单版)
ROMAN_MAP = {
    "i": 0, "ii": 1, "iii": 2, "iv": 3, "v": 4, "vi": 5, "vii": 6
}

# ==========================================
# 辅助函数
# ==========================================

def to_latex_note(note: str) -> str:
    if '#' in note:
        base = note.replace('#', '')
        return f"\\text{{{base}}}^\\sharp"
    elif 'b' in note:
        base = note.replace('b', '')
        return f"\\text{{{base}}}\\flat"
    else:
        return f"\\text{{{note}}}"

def get_note_name_by_interval(root: str, semitones: int) -> str:
    root_val = NOTE_TO_INT.get(root)
    if root_val is None: return "?"
    target_val = (root_val + semitones) % 12
    use_flats = 'b' in root or root == 'F'
    return CHROMATIC_SCALE_FLAT[target_val] if use_flats else CHROMATIC_SCALE_SHARP[target_val]

def parse_roman(roman: str, scale: List[str]):
    """
    解析罗马数字 (e.g. 'vi7', 'IV') 到具体的 (Root, Type)
    """
    # 1. Extract degree
    lower_roman = roman.lower()
    degree_idx = -1
    degree_len = 0
    
    # Find the longest matching roman numeral prefix
    possible_romans = sorted(ROMAN_MAP.keys(), key=len, reverse=True) # vii, iii, ...
    
    for r in possible_romans:
        if lower_roman.startswith(r):
            degree_idx = ROMAN_MAP[r]
            degree_len = len(r)
            break
            
    if degree_idx == -1:
        # Default to I if parse fails
        return scale[0], "Major"
        
    root_note = scale[degree_idx]
    
    # 2. Extract suffix/type
    suffix = roman[degree_len:]
    
    # Determine chord type from roman case and suffix
    is_major_degree = roman[0].isupper()
    
    chord_type = "Major"
    
    if suffix == "":
        chord_type = "Major" if is_major_degree else "minor"
    elif suffix == "7":
        if is_major_degree:
            # V7 is dominant, but IV7 usually denotes dom7 in blues context?
            # Let's use a simple heuristic:
            # If it's V, and suffix is 7 -> Dom7
            # If it's I or IV, and suffix is 7 -> usually Dom7 in blues, or Maj7 in pop context if explicit
            # But standard roman notation: V7 = Dom, Imaj7 = Maj7.
            # Let's just map "7" to "7 (Dominant)" by default for simplicity in this parser,
            # unless it's specified.
            # Wait, usually 'I' means Major triad. 'V' means Major triad.
            # 'v' means minor triad.
            chord_type = "7" # Dominant 7
        else:
            # m7
            chord_type = "m7"
    elif suffix == "maj7":
        chord_type = "maj7"
    elif suffix == "m7":
        chord_type = "m7"
    elif suffix == "dim":
        chord_type = "diminished"
    elif suffix == "dim7":
        chord_type = "dim7"
    elif suffix == "ø7" or suffix == "m7b5":
        chord_type = "m7b5"
    elif suffix == "sus4":
        chord_type = "sus4"
    elif suffix == "sus2":
        chord_type = "sus2"
    
    # Fallback for pure minor degree with no suffix
    if not is_major_degree and suffix == "":
        chord_type = "minor"
    
    return root_note, chord_type

def generate_chord_data(root, type_name):
    # Map parser output types to formula keys if needed
    formula_key = type_name
    if type_name not in ALL_CHORD_FORMULAS:
        # Try to find a close match or default
        if type_name == "Major 7th": formula_key = "maj7"
        elif type_name == "minor 7th": formula_key = "m7"
        elif type_name == "Dominant 7th": formula_key = "7"
        elif type_name == "Half-diminished 7th": formula_key = "m7b5"
        # ...
    
    formula = ALL_CHORD_FORMULAS.get(formula_key, ALL_CHORD_FORMULAS["Major"])
    intervals = formula["intervals"]
    
    notes = []
    vexflow_keys = []
    root_octave = 4
    if root[0] in ['A', 'B']: root_octave = 3
    
    for interval in intervals:
        note_name = get_note_name_by_interval(root, interval)
        notes.append(note_name)
        octave_shift = interval // 12
        vex_octave = root_octave + octave_shift
        vexflow_keys.append(f"{note_name.lower()}/{vex_octave}")

    latex_name = to_latex_note(root) + formula["latex_suffix"]
    
    return {
        "root": root,
        "type": formula_key,
        "name": f"{root} {formula_key}",
        "latex": latex_name,
        "notes": notes,
        "vexflow_keys": vexflow_keys
    }


# ==========================================
# 路由定义
# ==========================================

class ConvertRequest(BaseModel):
    key: str
    numerals: List[str]

class GenerateRequest(BaseModel):
    key: str
    length: int = 4

@app.get("/api/keys")
def get_available_keys():
    return list(MUSIC_DATA.keys())

@app.get("/api/chord_types")
def get_chord_types():
    return list(ALL_CHORD_FORMULAS.keys())

@app.get("/api/calculate_chord")
def calculate_chord_endpoint(root: str, type: str):
    return generate_chord_data(root, type)

@app.get("/api/analyze/{key_name}")
def analyze_key(key_name: str, chord_type: str = "triad"):
    if key_name not in MUSIC_DATA: raise HTTPException(404, "Key not found")
    data = MUSIC_DATA[key_name]
    scale = data["notes"]
    
    chord_definitions = SEVENTH_TYPES if chord_type == "seventh" else TRIAD_TYPES
    
    chords = []
    for ct in chord_definitions:
        root_note = scale[ct["indexes"][0]]
        # Map definition type to our formula keys
        ftype = "Major"
        if ct["type"] == "minor": ftype = "minor"
        elif ct["type"] == "diminished": ftype = "diminished"
        elif ct["type"] == "Major 7th": ftype = "maj7"
        elif ct["type"] == "minor 7th": ftype = "m7"
        elif ct["type"] == "Dominant 7th": ftype = "7"
        elif ct["type"] == "Half-diminished 7th": ftype = "m7b5"
        
        cdata = generate_chord_data(root_note, ftype)
        cdata["degree"] = ct["degree"] # Keep the degree info
        chords.append(cdata)

    return {
        "key": key_name,
        "relative_minor": f"{data['minor']} minor",
        "signature": data["sig"],
        "scale": scale,
        "chords": chords
    }

# --- New Progression Endpoints ---

@app.get("/api/progressions/templates")
def get_progression_templates():
    return PROGRESSION_TEMPLATES

@app.post("/api/progressions/convert")
def convert_progression(req: ConvertRequest):
    if req.key not in MUSIC_DATA: raise HTTPException(404, "Key not found")
    scale = MUSIC_DATA[req.key]["notes"]
    
    result = []
    for roman in req.numerals:
        root, ctype = parse_roman(roman, scale)
        chord_data = generate_chord_data(root, ctype)
        chord_data["numeral"] = roman
        result.append(chord_data)
        
    return result

@app.post("/api/progressions/smart_generate")
def smart_generate(req: GenerateRequest):
    # Simple random walker
    if req.key not in MUSIC_DATA: raise HTTPException(404, "Key not found")
    
    # Basic numerals to choose from
    options = ["I", "ii", "iii", "IV", "V", "vi"]
    # Random sequence starting with I
    seq = ["I"]
    for _ in range(req.length - 1):
        seq.append(random.choice(options))
        
    # Convert to chords
    scale = MUSIC_DATA[req.key]["notes"]
    result = []
    for roman in seq:
        root, ctype = parse_roman(roman, scale)
        chord_data = generate_chord_data(root, ctype)
        chord_data["numeral"] = roman
        result.append(chord_data)
        
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
