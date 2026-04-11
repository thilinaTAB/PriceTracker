import asyncio
import re
from playwright.async_api import async_playwright
from utils.api_client import ApiClient

SHOP_NAME = "Mahajana Super"
SHOP_URL = "https://shopmahajana.com"
SHOP_LOGO = "https://shopmahajana.com/favicon.ico"

CATEGORIES = {
    "GROCERY": [
        "https://shopmahajana.com/c/clr64sm7l001ijc0ajgnfg0fb",  # Chocolates
        "https://shopmahajana.com/c/clr3mw6cg005qlb8fcimezrdr",  # Beverages
        "https://shopmahajana.com/c/clr1otqyi00cnz8ccwgiejvec",  # Fresh Vegetables
        "https://shopmahajana.com/c/clr5ah9nn006u12p6pnoktr6v",  # Fresh Fruits
        "https://shopmahajana.com/c/clrbr5tub006fnl05g6i6ov60",  # Milk and Eggs
        "https://shopmahajana.com/c/clr3iv7bd0022jopkeofvwd6f",  # Tea and Coffee
        "https://shopmahajana.com/c/clr7t8kwp0008vhefwmz9ngey",  # Milk Powders
    ]
}

def clean_price(price_text):
    if not price_text:
        return None
    cleaned = re.sub(r'[^\d.]', '', price_text.replace(',', ''))
    try:
        return float(cleaned)
    except ValueError:
        return None

async def scrape_product(page, url):
    try:
        await page.goto(url, wait_until="networkidle", timeout=30000)

        name = await page.locator('h1').first.text_content()

        name = name.strip() if name else None

        image = await page.locator('img[data-nimg="1"][width="1024"]').first.get_attribute('src')

        price_elements = await page.locator('p[style*="font-weight: 600"]').all()
        current_price = None
        for el in price_elements:
            text = await el.text_content()
            if 'Rs' in text:
                current_price = clean_price(text)
                break

        prev_price_elements = await page.locator(
            'p[style*="line-through"]').all()
        previous_price = None
        for el in prev_price_elements:
            text = await el.text_content()
            if 'Rs' in text:
                previous_price = clean_price(text)
                break

        if not name or not current_price:
            print(f"⚠️ Skipping {url} — missing name or price")
            return None

        return {
            "name": name,
            "price": current_price,
            "previousPrice": previous_price,
            "imageUrl": image,
            "sourceUrl": url,
            "isPromotion": previous_price is not None,
            "isAvailable": True
        }

    except Exception as e:
        print(f"❌ Error scraping {url}: {e}")
        return None

async def scrape_category(page, category_url):
    print(f"📄 Scraping category: {category_url}")
    await page.goto(category_url, wait_until="networkidle", timeout=30000)

    product_links = await page.locator(
        'div[class*="gridContainer"] a').all()

    urls = []
    for link in product_links:
        href = await link.get_attribute('href')
        if href and '/en/p/' in href:
            full_url = f"{SHOP_URL}{href}" if href.startswith('/') else href
            urls.append(full_url)

    print(f"Found {len(urls)} products")
    return list(set(urls))

async def run_scraper():
    api = ApiClient()
    shop_id = api.get_or_create_shop(SHOP_NAME, SHOP_URL, SHOP_LOGO)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        for category, urls in CATEGORIES.items():
            for category_url in urls:
                product_urls = await scrape_category(page, category_url)

                for product_url in product_urls:
                    product = await scrape_product(page, product_url)

                    if product:
                        product["shopId"] = shop_id
                        product["category"] = category
                        api.save_product(product)

                    await asyncio.sleep(1)

        await browser.close()
        print("✅ Scraping complete")

if __name__ == "__main__":
    asyncio.run(run_scraper())