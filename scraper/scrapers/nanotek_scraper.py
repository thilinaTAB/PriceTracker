import asyncio
from playwright.async_api import async_playwright
from utils.api_client import ApiClient

SHOP_NAME = "Nanotek"
SHOP_URL = "https://www.nanotek.lk"
SHOP_LOGO = "https://www.nanotek.lk/imgs/logo/nanotek-logo-social.jpg"

CATEGORIES = {
    "ELECTRONICS": [
        "https://www.nanotek.lk/category/laptop",
        "https://www.nanotek.lk/category/monitors-monitor-arms",
        "https://www.nanotek.lk/category/graphics-card",
        "https://www.nanotek.lk/category/processor",
    ]
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
    await page.goto(category_url, wait_until="networkidle", timeout=30000)

    product_links = await page.locator("li.ty-catPage-productListItem a").all()

    urls = []
    for link in product_links:
        href = await link.get_attribute("href")
        if href:
            urls.append(href)

    print(f"Found {len(urls)} products")
    return list(set(urls))

async def scrape_product(page, url):
    try:
        await page.goto(url, wait_until="networkidle", timeout=30000)

        name_el = page.locator("h1.ty-productTitle").first
        price_el = page.locator("span.ty-price-now").first
        prev_price_el = page.locator("span.ty-price-retail-price").first
        image_el = page.locator("div.ty-slideContent img").first
        isAvailable_el = page.locator("span.ty-special-msg").first

        is_available = True  # default
        if await isAvailable_el.count() > 0:
            isAvailable_text = await isAvailable_el.text_content()
            is_available = "Out of Stock" not in isAvailable_text

        name = await name_el.text_content()
        price_text = await price_el.text_content()


        prev_price_text = None
        if await prev_price_el.count() > 0:
            prev_price_text = await prev_price_el.text_content()

        image_url = await image_el.get_attribute("src")

        name = name.strip() if name else None
        price = clean_price(price_text)
        previous_price = clean_price(prev_price_text)

        if not name or not price:
            print(f"⚠️ Skipping {url} — missing name or price")
            return None

        return {
            "name": name,
            "price": price,
            "previousPrice": previous_price,
            "imageUrl": image_url,
            "sourceUrl": url,
            "isPromotion": previous_price is not None,
            "isAvailable": is_available
        }

    except Exception as e:
        print(f"❌ Error scraping {url}: {e}")
        return None

async def run_scraper():
    api = ApiClient()
    shop_id = api.get_or_create_shop(SHOP_NAME, SHOP_URL, SHOP_LOGO)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        for category, urls in CATEGORIES.items():
            for category_url in urls:
                page_num = 1
                all_urls = []

                while True:
                    url = f"{category_url}?page={page_num}"
                    found_urls = await scrape_category(page, url)

                    if not found_urls:
                        break

                    all_urls.extend(found_urls)
                    page_num += 1

                for product_url in all_urls:
                    product = await scrape_product(page, product_url)

                    if product:
                        product["shopId"] = shop_id
                        product["category"] = category
                        api.save_product(product)

                    await asyncio.sleep(1)

        await browser.close()
        print("✅ Nanotek scraping complete")

if __name__ == "__main__":
    asyncio.run(run_scraper())