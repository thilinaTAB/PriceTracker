import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

CACHE_FILE = "model_number_cache.json"

def _load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    return {}

def _save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)

_cache = _load_cache()

def normalize_brand(brand):
    if not brand:
        return None
    return brand.strip().upper()

def extract_model_number(name, brand, sub_category):
    if name in _cache:
        return _cache[name]

    try:
        response = _client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=20,
            messages=[
                {
                    "role": "system",
                    "content": """You are a product model number extractor for electronics products.

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
- "KOORUI 32" S3241XO 4K OLED 240Hz" → S3241XO
- "LENOVO L24-4C 24" 144HZ FHD IPS MONITOR" → L24-4C
- "Dell PRO P2725DE 100Hz IPS USB-C HUB" → P2725DE
- "NORTH BAYOU G45 Full Motion Monitor Arm" → G45
- "NORTH BAYOU H100-FP LAPTOP DESK ARM" → H100-FP
- "LENOVO THINKBOOK 16 G8 IRL CORE 5" → G8
- "Lenovo V15 G5 IRL Core i5 13th GEN" → V15 G5
- "HONOR MagicBook X16 Intel i5 16GB" → X16
- "Chuwi CoreBook i3 10TH GEN" → null
- "Gaming Chair Black Edition" → null"""
                },
                {
                    "role": "user",
                    "content": f"Product: {name}\nBrand: {brand}\nCategory: {sub_category}"
                }
            ]
        )
        result = response.choices[0].message.content.strip()
        if not result or "null" in result.lower():
            result = None

        _cache[name] = result
        _save_cache(_cache)

        return result

    except Exception as e:
        print(f"⚠️ LLM extraction failed for '{name}': {e}")
        return None