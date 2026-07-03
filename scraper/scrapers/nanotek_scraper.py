import asyncio
import re
from playwright.async_api import async_playwright
from utils.api_client import ApiClient
from utils.llm_client import extract_model_number, normalize_brand

SHOP_NAME = "Nanotek"
SHOP_URL = "https://www.nanotek.lk"
SHOP_LOGO = "https://www.nanotek.lk/imgs/logo/nanotek-logo-social.jpg"

CATEGORIES = {
        # "https://www.nanotek.lk/category/laptop": ("ELECTRONICS", "LAPTOP"),
        "https://www.nanotek.lk/category/monitors-monitor-arms": ("ELECTRONICS", "MONITOR"),
        "https://www.nanotek.lk/category/graphics-card": ("ELECTRONICS", "GRAPHICS_CARD"),
        "https://www.nanotek.lk/category/processor": ("ELECTRONICS", "PROCESSOR"),
        "https://www.nanotek.lk/category/motherboards": ("ELECTRONICS", "MOTHERBOARD"),
        "https://www.nanotek.lk/category/memory-ram": ("ELECTRONICS", "RAM"),
        "https://www.nanotek.lk/category/storage-nas": ("ELECTRONICS", "STORAGE"),
        "https://www.nanotek.lk/category/power-supply-ups-surge-protectors": ("ELECTRONICS", "POWER_SUPPLY_UPS"),
}

def clean_price(price_text):
    if not price_text:
        return None
    cleaned = price_text.strip().replace(",", "").replace("LKR", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None

async def scrape_category(page, category_url):
    print(f"📄 Scraping category: {category_url}")
    try:
        await page.goto(category_url, wait_until="networkidle", timeout=30000)
        product_links = await page.locator("li.ty-catPage-productListItem a").all()

        urls = []
        for link in product_links:
            href = await link.get_attribute("href")
            if href:
                urls.append(href)

        return list(set(urls))
    except Exception as e:
        print(f"❌ Error indexing Nanotek listing grid: {e}")
        return []

async def scrape_product(page, url, sub_category):
    try:
        await page.goto(url, wait_until="networkidle", timeout=30000)

        # 1. Define selectors lazily
        name_el = page.locator("h1.ty-productTitle").first
        price_el = page.locator("span.ty-price-now").first
        prev_price_el = page.locator("span.ty-price-retail-price").first
        image_el = page.locator("div.ty-slideContent img").first
        is_available_el = page.locator("span.ty-special-msg").first
        description_el = page.locator("div.ty-productPage-info.js-product-page-description-container").first

        # 2. Safety defensive guard check BEFORE forcing .text_content() evaluations
        if await price_el.count() == 0:
            print(f"⚠️ Price element missing for {url}. Item might be unpriced or call-for-price. Skipping...")
            return None

        # 3. Safe to resolve text contents now that existence is verified
        is_available = True
        if await is_available_el.count() > 0:
            is_available_text = await is_available_el.text_content()
            is_available = "Out of Stock" not in is_available_text

        name = await name_el.text_content()
        brand = normalize_brand(name.split()[0] if name else None)
        price_text = await price_el.text_content()
        
        description = ""
        if await description_el.count() > 0:
            description = await description_el.text_content()

        prev_price_text = None
        if await prev_price_el.count() > 0:
            prev_price_text = await prev_price_el.text_content()

        image_url = await image_el.get_attribute("src")

        name = name.strip() if name else None
        price = clean_price(price_text)
        previous_price = clean_price(prev_price_text)
        
        # Safe extraction pass down to your robust hybrid cache engine
        model_number = extract_model_number(name, brand, sub_category)

        if not name or not price:
            print(f"⚠️ Skipping {url} — missing name or price")
            return None

        return {
            "name": name,
            "brand": brand,
            "modelNumber": model_number,
            "sku": None,
            "price": price,
            "previousPrice": previous_price,
            "imageUrl": image_url,
            "sourceUrl": url,
            "isPromotion": previous_price is not None,
            "isAvailable": is_available,
            "description": description.strip() if description else name
        }

    except Exception as e:
        print(f"❌ Error scraping product details {url}: {e}")
        return None

async def run_scraper():
    api = ApiClient()
    shop_id = api.get_or_create_shop(SHOP_NAME, SHOP_URL, SHOP_LOGO)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        for category_url, (category, sub_category) in CATEGORIES.items():
            page_num = 1
            all_urls = []

            while True:
                url = f"{category_url}?page={page_num}"
                found_urls = await scrape_category(page, url)

                if not found_urls:
                    break

                old_count = len(all_urls)
                all_urls = list(set(all_urls + found_urls))
                
                # Infinite Loop Guard: Exit if no new unique links are loaded
                if len(all_urls) == old_count:
                    break

                page_num += 1
                await asyncio.sleep(0.5)

            print(f"Total products found for [{sub_category}]: {len(all_urls)}")

            for product_url in all_urls:
                product = await scrape_product(page, product_url, sub_category)

                if product:
                    product["shopId"] = shop_id
                    product["category"] = category
                    product["subCategory"] = sub_category
                    api.save_product(product)

                await asyncio.sleep(1)

        await browser.close()
        print("✅ Nanotek scraping complete")

if __name__ == "__main__":
    asyncio.run(run_scraper())