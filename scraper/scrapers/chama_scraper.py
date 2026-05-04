import requests
from bs4 import BeautifulSoup
import json
from utils.api_client import ApiClient

SHOP_NAME = "Chama Computers"
SHOP_URL = "https://www.chamacomputers.lk"
SHOP_LOGO = "https://www.chamacomputers.lk/img/LOGO_White.png"

CATEGORIES = {
    "https://www.chamacomputers.lk/products/processors": ("ELECTRONICS", "PROCESSOR"),
    "https://www.chamacomputers.lk/products/memory": ("ELECTRONICS", "RAM"),
    "https://www.chamacomputers.lk/products/thermal%20paste": ("ELECTRONICS", "OTHER_ELECTRONICS"),
    "https://www.chamacomputers.lk/products/motherboards": ("ELECTRONICS", "MOTHERBOARD"),
    "https://www.chamacomputers.lk/products/coolers": ("ELECTRONICS", "OTHER_ELECTRONICS"),
    "https://www.chamacomputers.lk/products/ssd": ("ELECTRONICS", "STORAGE"),
    "https://www.chamacomputers.lk/products/storage": ("ELECTRONICS", "STORAGE"),
    "https://www.chamacomputers.lk/products/graphics%20cards": ("ELECTRONICS", "GRAPHICS_CARD"),
    "https://www.chamacomputers.lk/products/power%20supply": ("ELECTRONICS", "POWER_SUPPLY_UPS"),

}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

def clean_price(price_text):
    if not price_text:
        return None
    try:
        return float(str(price_text).strip().replace(",", ""))
    except ValueError:
        return None

def scrape_category_page(category_url, page_num):
    print(f"📄 Scraping category: {category_url} page {page_num}")
    url = f"{category_url}?page={page_num}"
    response = requests.get(url, headers=HEADERS)
    soup = BeautifulSoup(response.text, "html.parser")

    links = soup.find_all("a", href=True)
    slug = category_url.split("/products/")[1]
    product_links = [l["href"] for l in links if f"/products/{slug}/" in l["href"]]

    print(f"Found {len(product_links)} products")
    return list(set(product_links))

def scrape_product(product_path):
    try:
        url = f"https://www.chamacomputers.lk{product_path}"
        response = requests.get(url, headers=HEADERS)
        soup = BeautifulSoup(response.text, "html.parser")

        scripts = soup.find_all("script", type="application/ld+json")
        product_data = None
        for script in scripts:
            data = json.loads(script.string)
            if data.get("@type") == "Product":
                product_data = data
                break

        if not product_data:
            print(f"⚠️ Skipping {url} — no product data found")
            return None

        name = product_data.get("name")
        brand = product_data.get("brand", {}).get("name")
        sku = product_data.get("sku")
        image = product_data.get("image")
        offers = product_data.get("offers", {})
        price = clean_price(offers.get("price"))
        availability = offers.get("availability", "")
        is_available = "InStock" in availability

        if not name or not price:
            print(f"⚠️ Skipping {url} — missing name or price")
            return None

        return {
            "name": name,
            "brand": brand,
            "sku": sku,
            "price": price,
            "previousPrice": None,
            "imageUrl": image,
            "sourceUrl": url,
            "isPromotion": False,
            "isAvailable": is_available
        }

    except Exception as e:
        print(f"❌ Error scraping {product_path}: {e}")
        return None

def run_scraper():
    api = ApiClient()
    shop_id = api.get_or_create_shop(SHOP_NAME, SHOP_URL, SHOP_LOGO)

    for category_url, (category, sub_category) in CATEGORIES.items():
        page_num = 1
        all_urls = []

        while True:
            found_urls = scrape_category_page(category_url, page_num)

            if not found_urls:
                break

            all_urls.extend(found_urls)
            page_num += 1

        print(f"Total products found: {len(all_urls)}")

        for product_path in all_urls:
            product = scrape_product(product_path)

            if product:
                product["shopId"] = shop_id
                product["category"] = category
                product["subCategory"] = sub_category
                api.save_product(product)

    print("✅ Chama scraping complete")

if __name__ == "__main__":
    run_scraper()