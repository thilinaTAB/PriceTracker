import asyncio
import re
from urllib.parse import urljoin

from playwright.async_api import async_playwright, TimeoutError

from utils.api_client import ApiClient
from utils.llm_client import extract_model_number, normalize_brand


SHOP_NAME = "Nanotek"
SHOP_URL = "https://www.nanotek.lk"
SHOP_LOGO = "https://www.nanotek.lk/imgs/logo/nanotek-logo-social.jpg"

CATEGORIES = {
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

    price_text = (
        price_text.replace(",", "")
        .replace("LKR", "")
        .replace("Rs.", "")
        .replace("Rs", "")
        .strip()
    )

    m = re.search(r"(\d+(\.\d+)?)", price_text)

    if not m:
        return None

    try:
        return float(m.group(1))
    except:
        return None


async def close_popup(page):
    selectors = [
        "button:has-text('Close')",
        ".modal button",
        ".popup button",
        ".close",
        ".btn-close"
    ]

    for selector in selectors:
        try:
            btn = page.locator(selector).first

            if await btn.count() > 0:
                await btn.click(timeout=1000)
                await page.wait_for_timeout(500)
                return
        except:
            pass


async def auto_scroll(page):

    previous = 0

    while True:

        current = await page.locator(
            "div.ty-productBlock-wrap"
        ).count()

        if current == previous:
            break

        previous = current

        await page.evaluate(
            "window.scrollTo(0, document.body.scrollHeight)"
        )

        await page.wait_for_timeout(1500)


async def scrape_category(page, category_url):

    print(f"\n📂 {category_url}")

    try:

        await page.goto(
            category_url,
            wait_until="domcontentloaded",
            timeout=60000
        )

        await close_popup(page)

        await page.wait_for_selector(
            "div.ty-productBlock-wrap",
            timeout=20000
        )

        # Small scroll for lazy-loaded products/images
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(1000)

        anchors = page.locator("a[href*='/product/']")

        urls = []

        for i in range(await anchors.count()):

            href = await anchors.nth(i).get_attribute("href")

            if href:
                urls.append(urljoin(SHOP_URL, href))

        # Remove duplicates while preserving order
        urls = list(dict.fromkeys(urls))

        print(f"✅ {len(urls)} products indexed")

        return urls

    except Exception as e:

        print(f"❌ Category Error: {e}")

        return []

async def scrape_product(page, url, sub_category):

    try:

        await page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=60000
        )

        await close_popup(page)

        await page.wait_for_selector(
            "h1.ty-productTitle",
            timeout=20000
        )

        # -------------------------
        # Product Name
        # -------------------------
        name = await page.locator(
            "h1.ty-productTitle"
        ).first.text_content()

        name = name.strip() if name else None

        if not name:
            print(f"⚠️ Missing product name: {url}")
            return None

        # -------------------------
        # Brand
        # -------------------------
        brand = normalize_brand(name.split()[0])

        # -------------------------
        # Current Price
        # -------------------------
        price = None

        price_selectors = [
            "div.ty-pay-price span",
            "h2.ty-productBlock-price-retail",
            "div.ty-productPage-price h2"
        ]

        for selector in price_selectors:

            locator = page.locator(selector).first

            if await locator.count() > 0:

                text = await locator.text_content()

                price = clean_price(text)

                if price is not None:
                    break

        if price is None:
            print(f"⚠️ No price found: {url}")
            return None

        # -------------------------
        # Previous Price
        # -------------------------
        previous_price = None

        prev_selectors = [
            "div.ty-vs-price span",
            "span.ty-productBlock-price-prev span"
        ]

        for selector in prev_selectors:

            locator = page.locator(selector).first

            if await locator.count() > 0:

                text = await locator.text_content()

                previous_price = clean_price(text)

                if previous_price is not None:
                    break

        # -------------------------
        # Availability
        # -------------------------
        is_available = True

        stock = page.locator("span.ty-special-msg").first

        if await stock.count() > 0:

            stock_text = await stock.text_content()

            if stock_text:

                stock_text = stock_text.lower()

                if "out of stock" in stock_text or "sold out" in stock_text:
                    is_available = False

        # -------------------------
        # Image
        # -------------------------
        image_url = None

        img = page.locator("div.ty-slideContent img").first

        if await img.count() > 0:

            image_url = await img.get_attribute("src")

            if not image_url:
                image_url = await img.get_attribute("data-src")

            if not image_url:
                image_url = await img.get_attribute("data-lazy")

            if image_url:
                image_url = urljoin(SHOP_URL, image_url)

        # -------------------------
        # Description
        # -------------------------
        description = name

        desc = page.locator("div.ty-productPage-info").first

        if await desc.count() > 0:

            description = await desc.inner_text()

            description = re.sub(r"\s+", " ", description).strip()

            if not description:
                description = name

        # -------------------------
        # SKU
        # -------------------------
        sku = None

        body = await page.locator("body").inner_text()

        sku_match = re.search(
            r"SKU[:\s]+([A-Za-z0-9\-_/.]+)",
            body,
            re.IGNORECASE
        )

        if sku_match:
            sku = sku_match.group(1)

        # -------------------------
        # Model Number
        # -------------------------
        model_number = extract_model_number(
            name,
            brand,
            sub_category
        )

        return {

            "name": name,
            "brand": brand,
            "modelNumber": model_number,
            "sku": sku,
            "price": price,
            "previousPrice": previous_price,
            "imageUrl": image_url,
            "sourceUrl": url,
            "isPromotion": (
                previous_price is not None
                and previous_price > price
            ),
            "isAvailable": is_available,
            "description": description

        }

    except TimeoutError:

        print(f"⌛ Timeout: {url}")
        return None

    except Exception as e:

        print(f"❌ Error scraping {url}")
        print(e)

        return None
    
async def run_scraper():

    api = ApiClient()

    shop_id = api.get_or_create_shop(
        SHOP_NAME,
        SHOP_URL,
        SHOP_LOGO
    )

    async with async_playwright() as p:

        browser = await p.chromium.launch(
            headless=True
        )

        listing_page = await browser.new_page()

        for category_url, (category, sub_category) in CATEGORIES.items():

            print("\n" + "=" * 70)
            print(f"📂 {sub_category}")
            print("=" * 70)

            page_num = 1
            all_urls = []

            while True:

                page_url = f"{category_url}?page={page_num}"

                print(f"\n📄 Page {page_num}")

                urls = await scrape_category(
                    listing_page,
                    page_url
                )

                if not urls:
                    print("No more pages.")
                    break

                before = len(all_urls)

                all_urls.extend(urls)

                # Remove duplicates
                all_urls = list(dict.fromkeys(all_urls))

                # No new products → stop
                if len(all_urls) == before:
                    print("Reached last page.")
                    break

                page_num += 1

            print(f"\n✅ Total Products : {len(all_urls)}")

            # -------------------------
            # Scrape products
            # -------------------------

            product_page = await browser.new_page()

            for index, url in enumerate(all_urls, start=1):

                print(f"[{index}/{len(all_urls)}] {url}")

                product = await scrape_product(
                    product_page,
                    url,
                    sub_category
                )

                if product:

                    product["shopId"] = shop_id
                    product["category"] = category
                    product["subCategory"] = sub_category

                    api.save_product(product)

            await product_page.close()

        await listing_page.close()
        await browser.close()

    print("\n✅ Nanotek scraping complete.")


if __name__ == "__main__":
    asyncio.run(run_scraper())