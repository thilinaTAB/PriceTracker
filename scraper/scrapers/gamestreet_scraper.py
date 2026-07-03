import requests
from bs4 import BeautifulSoup
import re
import time
from utils.api_client import ApiClient
from utils.llm_client import extract_model_number, normalize_brand

SHOP_NAME = "Game Street"
SHOP_URL = "https://www.gamestreet.lk"
SHOP_LOGO = "https://www.gamestreet.lk/images/logo.png"

CATEGORIES = {
    # "https://www.gamestreet.lk/products.php?cat=MQ==&scat=Mzc=": ("ELECTRONICS", "LAPTOP"),  # Gaming Laptops
    "https://www.gamestreet.lk/products.php?cat=MQ==&scat=Mzg=": ("ELECTRONICS", "LAPTOP"),  # Consumer Laptops
    "https://www.gamestreet.lk/products.php?cat=Mg==&scat=MQ==": ("ELECTRONICS", "PROCESSOR"),
    "https://www.gamestreet.lk/products.php?cat=Mg==&scat=NQ==": ("ELECTRONICS", "POWER_SUPPLY_UPS"),
    "https://www.gamestreet.lk/products.php?cat=Mg==&scat=Mw==": ("ELECTRONICS", "RAM"),
    "https://www.gamestreet.lk/products.php?cat=Mg==&scat=Mg==": ("ELECTRONICS", "MOTHERBOARD"),
    "https://www.gamestreet.lk/products.php?cat=Mg==&scat=MTE=": ("ELECTRONICS", "STORAGE"),       # HDDs
    "https://www.gamestreet.lk/products.php?cat=Mg==&scat=MTM=": ("ELECTRONICS", "STORAGE"),       # SSDs
    "https://www.gamestreet.lk/products.php?cat=Mg==&scat=Ng==": ("ELECTRONICS", "GRAPHICS_CARD"),
    "https://www.gamestreet.lk/products.php?cat=Mg==&scat=OA==": ("ELECTRONICS", "MONITOR")        # Monitors
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def clean_price(price_text):
    if not price_text:
        return None
    cleaned = re.sub(r'[^\d.]', '', str(price_text).strip())
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None

def scrape_category_page(category_url):
    print(f"📄 Indexing category grid: {category_url}")
    
    try:
        response = requests.get(category_url, headers=HEADERS, timeout=15)
        if response.status_code != 200:
            return []
            
        soup = BeautifulSoup(response.text, "html.parser")
        product_links = []
        
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            
            # Catch any link containing the product ID parameter "pid="
            if "pid=" in href:
                # Standardize all paths to use product_view.php
                if "product_view.php" not in href:
                    pid_match = re.search(r'pid=([^&]+)', href)
                    if pid_match:
                        href = f"product_view.php?pid={pid_match.group(1)}"

                if not href.startswith("http"):
                    href = f"https://www.gamestreet.lk/{href.lstrip('/')}"
                product_links.append(href)
                
        return list(set(product_links))
    except Exception as e:
        print(f"❌ Error fetching category grid layout: {e}")
        return []

def scrape_product(url, sub_category):
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        if response.status_code != 200:
            return None
            
        response.encoding = response.apparent_encoding
        soup = BeautifulSoup(response.text, "html.parser")
        
        # --- CRITICAL SAFETY SPLIT: Chop off Similar Products noise ---
        raw_html_text = soup.get_text()
        if "Similar Products" in raw_html_text:
            product_section_text = raw_html_text.split("Similar Products")[0]
        else:
            product_section_text = raw_html_text

        # --- EXTRACT METADATA FIELDS ---
        brand = None
        brand_match = re.search(r'»\s*Brand\s*:\s*([^\n»]+)', product_section_text, re.IGNORECASE)
        if brand_match:
            brand = brand_match.group(1).strip()
            
        sku = None
        sku_match = re.search(r'»\s*Part\s*Number\s*:\s*([^\n»]+)', product_section_text, re.IGNORECASE)
        if sku_match:
            sku = sku_match.group(1).strip()

        # --- EXTRACT ITEM NAME ---
        raw_name = "Unknown Product"
        text_lines = [line.strip() for line in product_section_text.split("\n") if line.strip()]
        for i, line in enumerate(text_lines):
            if "» Brand" in line or "»  Brand" in line:
                if i > 0:
                    raw_name = text_lines[i-1]
                    if "Contact Form" in raw_name or "View Quotation" in raw_name:
                        if i > 1:
                            raw_name = text_lines[i-2]
                break

        # --- EXTRACT PRICING SAFELY ---
        price_matches = re.findall(r'Rs\.\s*([\d,]+(?:\.\d{2})?)', product_section_text)
        raw_numbers = re.findall(r'\b\d{2,3},\d{3}\.\d{2}\b', product_section_text)
        
        local_prices = []
        for match in price_matches:
            val = float(match.replace(",", ""))
            if val > 10.0:
                local_prices.append(val)
                
        for match in raw_numbers:
            val = float(match.replace(",", ""))
            if val > 10.0:
                local_prices.append(val)

        local_prices = list(dict.fromkeys(local_prices))
        
        price = None
        previous_price = None
        if local_prices:
            price = local_prices[0]
            if len(local_prices) > 1 and local_prices[1] > price:
                previous_price = local_prices[1]

        if not price:
            print(f"⚠️ Skipping {url} — core price parsing returned None")
            return None

        # Inventory configuration
        is_available = True
        if "Out of stock" in product_section_text or "Out of Stock" in product_section_text:
            is_available = False

        if not brand:
            brand = raw_name.split()[0]
        brand = normalize_brand(brand)
        
        # Extract Image layout path
        image_url = None
        for img in soup.find_all("img", src=True):
            if "products/" in img["src"] and "logo" not in img["src"].lower():
                image_url = img["src"]
                if not image_url.startswith("http"):
                    image_url = f"https://www.gamestreet.lk/{image_url.lstrip('/')}"
                break

        # Model number extraction engine sequence
        model_number = extract_model_number(raw_name, brand, sub_category)

        return {
            "name": raw_name,
            "brand": brand,
            "modelNumber": model_number,
            "sku": sku,
            "price": price,
            "previousPrice": previous_price,
            "imageUrl": image_url,
            "sourceUrl": url,
            "isPromotion": previous_price is not None and previous_price > price,
            "isAvailable": is_available,
            "description": raw_name
        }

    except Exception as e:
        print(f"❌ Structural layout error processing details page ({url}): {e}")
        return None

def run_scraper():
    api = ApiClient()
    shop_id = api.get_or_create_shop(SHOP_NAME, SHOP_URL, SHOP_LOGO)

    for category_url, (category, sub_category) in CATEGORIES.items():
        all_urls = scrape_category_page(category_url)
        
        print(f"📦 Total matching URLs isolated for [{sub_category}]: {len(all_urls)}")

        for product_url in all_urls:
            product = scrape_product(product_url, sub_category)

            if product:
                product["shopId"] = shop_id
                product["category"] = category
                product["subCategory"] = sub_category
                
                # Deliver payload to Spring Boot sync target logic
                api.save_product(product)

            # Mandatory 1-second delay block to respect target system capacity
            time.sleep(1)

    print("✅ Game Street extraction matrix successfully completed and fully synced.")

if __name__ == "__main__":
    run_scraper()