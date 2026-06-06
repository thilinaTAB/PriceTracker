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
- Do NOT include: WIFI, DDR4, DDR5, D4, D5, AX, GHz, GB, connectivity specs, or generation info
- Do NOT include brand name or series name (e.g. PRIME, TUF, ROG, PRO)
- If product has no specific model code (generic items, accessories, vague names), return null
- "CoreBook", "IdeaPad", "ThinkBook" and similar are product series names, not model codes — return null if no alphanumeric code exists
- Return ONLY the model number, nothing else"""
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