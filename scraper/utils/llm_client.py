import os
import re
import json
import time
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# --- AUTOMATED MULTI-ACCOUNT ROTATION POOL ---
# Collects your exact environment variables into a list
_GROQ_KEYS = [
    os.getenv("GROQ_API_KEY"),
    os.getenv("GROQ_API_KEY2"),
    os.getenv("GROQ_API_KEY3")
]
# Strip whitespaces and filter out missing/empty keys dynamically
_GROQ_KEYS = [k.strip() for k in _GROQ_KEYS if k and k.strip()]

_current_key_index = 0

def _get_groq_client():
    global _current_key_index
    if not _GROQ_KEYS:
        print("❌ Critical Warning: No valid Groq API keys found in your environment setup.")
        return None
    # Pick the active client instance based on the rotation pointer index
    return Groq(api_key=_GROQ_KEYS[_current_key_index])

def _rotate_groq_key():
    global _current_key_index
    if len(_GROQ_KEYS) > 1:
        _current_key_index = (_current_key_index + 1) % len(_GROQ_KEYS)
        print(f"🔄 Groq 429 Rate Limit hit. Rotating to API Key Account Index: {_current_key_index + 1}...")
    else:
        print("⚠️ No alternative Groq key slots found in your configuration to handle account rotation.")

CACHE_FILE = "model_number_cache.json"

def _load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            # Defensive fix: Prevent crashes if the json file was empty or corrupted
            print(f"⚠️ Cache file '{CACHE_FILE}' was unreadable or empty. Resetting local cache...")
            return {}
    return {}

def _save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)

_cache = _load_cache()

def normalize_brand(brand):
    if not brand:
        return None
    return brand.strip().upper()

def _regex_extract(name, sub_category):
    # --- LAPTOP PROTECTION LAYER ---
    # Stops internal component details (like CPU/GPU specs) from hijacking laptop frame models
    if sub_category == "LAPTOP":
        return None

    noise = r'(?!(?:DDR\d?|WIFI|ULTRA|ELITE|MAX|AX|ARGB|RGB|GEN|SERIES|EDITION|CORE)\b)'

    patterns = {
        "GRAPHICS_CARD": [
            r'RTX\s?\d+\s?(?:Ti|Super)?',
            r'GTX\s?\d+\s?(?:Ti|Super)?',
        ],
        "PROCESSOR": [
            r'Ryzen\s\d\s\d+\w*',
            r'Core\s[iI]\d-\d+\w*',
        ],
        "LAPTOP": [
            r'[A-Z]{2,}\d{3,}[A-Z]{2,}\d*',
            r'[A-Z]\d{2,}[A-Z]{2,}\d*',
            r'[A-Z]\d[A-Z]{2,}\d*',
            r'\d{2}[A-Z]{2,}\d+',
            r'[A-Z]\d{4,}[A-Z]{2,}',
        ],
    }

    general_patterns = [
        r'RTX\s?\d+\s?(?:Ti|Super)?',
        r'GTX\s?\d+\s?(?:Ti|Super)?',
        r'Ryzen\s\d\s\d+\w*',
        r'Core\s[iI]\d-\d+\w*',
        r'[A-Z]\d{3,}[A-Z0-9]*(?:-[A-Z0-9]+)+',
        r'[A-Z]\d{3,}[A-Z0-9]*(?:\s' + noise + r'[A-Z]{2,}){1,2}',
        r'[A-Z]\d{3,}[A-Z0-9]+',
        r'[A-Z]{2,}\d+[A-Z]{2,}',
        r'[A-Z]\d+-[A-Z0-9]+',
        r'[A-Z]\d+\s[A-Z]{2,}',
    ]

    active_patterns = patterns.get(sub_category, general_patterns)

    for pattern in active_patterns:
        match = re.search(pattern, name, re.IGNORECASE)
        if match:
            result = match.group().strip()
            result = re.sub(r'(RTX|GTX)(\d)', r'\1 \2', result, flags=re.IGNORECASE)
            return result

    return None

def _get_system_prompt_instruction():
    return """You are a product model number extractor for electronics products.

Rules:
- Extract the specific manufacturer model code/number only
- For motherboards: extract the model code only, stop before connectivity/memory specs (e.g. B760M-A not B760M-A WIFI D5, B760M-P not B760M-P DDR4, B760M GAMING PLUS not B760M GAMING PLUS WIFI)
- For GPUs: return format like RTX 5080, RTX 5070 Ti (no memory size)
- For CPUs: return full name like Ryzen 5 5600X, i7-13700K
- For laptops: return the alphanumeric model code only (e.g. FA506NCQ, FA2787NR, A13UDX). If only a generic processor name exists with no laptop model code, return null
- For monitors: extract the model code (e.g. 274QPF, S3241XO, L24-4C, P2725DE, AW3425DWM)
- For monitor arms/mounts: extract the short model code (e.g. G45, F160, H100-FP, M150, SP5)
- For laptops with series+generation codes: extract both (e.g. V15 G5, G8, P16, X16)
- Do NOT include: WIFI, DDR4, DDR5, D4, D5, AX, GHz, GB, connectivity specs, generation info, screen size
- Do NOT include brand name or series name (e.g. PRIME, TUF, ROG, PRO, MAG, UltraSharp)
- If product has no specific model code (generic items, accessories, vague names), return null
- "CoreBook", "IdeaPad", "ThinkBook" and similar are product series names, not model codes — return null if no alphanumeric code exists
- Return ONLY the model number, nothing else

Examples:
- "MSI MAG 274QPF E20 2560X1440 200HZ IPS" → 274QPF
- "KOORUI 32\" S3241XO 4K OLED 240Hz" → S3241XO
- "LENOVO L24-4C 24\" 144HZ FHD IPS MONITOR" → L24-4C
- "Dell PRO P2725DE 100Hz IPS USB-C HUB" → P2725DE
- "NORTH BAYOU G45 Full Motion Monitor Arm" → G45
- "NORTH BAYOU H100-FP LAPTOP DESK ARM" → H100-FP
- "LENOVO THINKBOOK 16 G8 IRL CORE 5" → G8
- "Lenovo V15 G5 IRL Core i5 13th GEN" → V15 G5
- "HONOR MagicBook X16 Intel i5 16GB" → X16
- "Chuwi CoreBook i3 10TH GEN" → null
- "Gaming Chair Black Edition" → null"""

def _llm_extract(name, brand, sub_category):
    # Loop up to the absolute length of your key registry to exhaust all options
    for _ in range(max(1, len(_GROQ_KEYS))):
        client = _get_get_groq_client = _get_groq_client()
        if not client:
            return None
            
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=20,
                messages=[
                    {"role": "system", "content": _get_system_prompt_instruction()},
                    {"role": "user", "content": f"Product: {name}\nBrand: {brand}\nCategory: {sub_category}"}
                ]
            )
            result = response.choices[0].message.content.strip()
            if not result or "null" in result.lower():
                return None
            return result

        except Exception as e:
            # Trap for standard 429 Rate Limits / Quotas Exceeded exceptions
            if "rate_limit_exceeded" in str(e) or "429" in str(e):
                _rotate_groq_key()
                continue  # Retries the run instantly with your next available key index
            else:
                print(f"⚠️ Groq Extraction Error for '{name}': {e}")
                return None
                
    print(f"❌ All {len(_GROQ_KEYS)} Groq keys exhausted due to rate limits for item: {name}")
    return None

def extract_model_number(name, brand, sub_category):
    if name in _cache:
        return _cache[name]

    result = _regex_extract(name, sub_category)

    if result is None:
        print(f"🤖 LLM fallback for: {name}")
        result = _llm_extract(name, brand, sub_category)

    _cache[name] = result
    _save_cache(_cache)

    return result