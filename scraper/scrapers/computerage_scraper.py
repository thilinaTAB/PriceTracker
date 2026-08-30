import asyncio
import re
from urllib.parse import urljoin

from playwright.async_api import async_playwright, TimeoutError

from utils.scraper_utils import (
    add_product_metadata,
    initialize_shop
)

from utils.llm_client import (
    extract_model_number,
    extract_variant_value,
    normalize_brand
)


SHOP_NAME = "ComputerAge"
SHOP_URL = "https://computerage.lk"

SHOP_LOGO = "https://i0.wp.com/computerage.lk/wp-content/uploads/2024/07/computarage-logo-updated.png"

CATEGORIES = {
    "https://computerage.lk/product-category/pc-components/processor/":
        ("ELECTRONICS", "PROCESSOR"),

    "https://computerage.lk/product-category/pc-components/graphic-cards/":
        ("ELECTRONICS", "GRAPHICS_CARD"),

    "https://computerage.lk/product-category/pc-components/motherboard/":
        ("ELECTRONICS", "MOTHERBOARD"),

    "https://computerage.lk/product-category/pc-components/memory-ram/":
        ("ELECTRONICS", "RAM"),

    "https://computerage.lk/product-category/pc-components/storage-nas/":
        ("ELECTRONICS", "STORAGE"),

    "https://computerage.lk/product-category/pc-components/casings/":
        ("ELECTRONICS", "CASING"),

    "https://computerage.lk/product-category/pc-components/cooling-and-lighting/":
        ("ELECTRONICS", "OTHER_COMPONENTS"),

    "https://computerage.lk/product-category/monitors-accessories/":
        ("ELECTRONICS", "MONITOR"),
}


def clean_text(text):
    if not text:
        return None

    return re.sub(r"\s+", " ", text).strip()


def clean_price(price_text):
    if not price_text:
        return None

    text = str(price_text)

    # Remove currency and separators
    text = (
        text
        .replace(",", "")
        .replace("LKR", "")
        .replace("Rs.", "")
        .replace("Rs", "")
        .replace("රු", "")
    )

    match = re.search(
        r"\d+(?:\.\d+)?",
        text
    )

    if not match:
        return None

    try:
        return float(match.group())
    except ValueError:
        return None


async def close_popups(page):
    """
    ComputerAge may display modal/popup elements.
    This function attempts common close controls without
    failing the scraper if none exists.
    """

    selectors = [
        "button[aria-label='Close']",
        "button.close",
        ".close",
        ".modal-close",
        ".mfp-close",
        ".wd-close",
        ".wd-popup-close"
    ]

    for selector in selectors:

        try:

            locator = page.locator(
                selector
            ).first

            if await locator.count() > 0:
                await locator.click(
                    timeout=1000
                )

                await page.wait_for_timeout(
                    300
                )

        except Exception:
            pass


async def collect_product_urls(page, category_url):
    """
    ComputerAge uses a Load More products mechanism.
    This method keeps clicking Load More until no additional
    products are loaded.
    """

    print(
        f"\n📂 Indexing: {category_url}"
    )

    try:

        await page.goto(
            category_url,
            wait_until="domcontentloaded",
            timeout=60000
        )

        await close_popups(page)

        await page.wait_for_timeout(1500)

        # Wait until products appear
        await page.wait_for_selector(
            "a[href*='/product/']",
            timeout=20000
        )

        previous_count = 0

        while True:

            product_links = page.locator(
                "a[href*='/product/']"
            )

            current_count = await product_links.count()

            print(
                f"   Products currently loaded: "
                f"{current_count}"
            )

            if current_count == previous_count:
                break

            previous_count = current_count

            # Find the actual ComputerAge
            # "Load more products" control.
            load_more = page.get_by_text(
                "Load more products",
                exact=True
            ).last

            if await load_more.count() == 0:
                break

            try:

                await load_more.scroll_into_view_if_needed()

                await load_more.click(
                    timeout=5000
                )

            except Exception:

                # If the text element itself isn't clickable,
                # try its parent button/link.
                parent = load_more.locator(
                    "xpath=.."
                ).first

                if await parent.count() == 0:
                    break

                try:
                    await parent.click(
                        timeout=5000
                    )
                except Exception:
                    break

            # Wait for AJAX-loaded products.
            try:

                await page.wait_for_function(
                    """
                    previous => {
                        const count =
                            document.querySelectorAll(
                                "a[href*='/product/']"
                            ).length;

                        return count > previous;
                    }
                    """,
                    arg=previous_count,
                    timeout=15000
                )

            except TimeoutError:

                # Give the page a little extra time.
                await page.wait_for_timeout(
                    2000
                )

                new_count = await page.locator(
                    "a[href*='/product/']"
                ).count()

                if new_count <= previous_count:
                    break

        # Collect URLs only after all products are loaded.
        anchors = page.locator(
            "a[href*='/product/']"
        )

        urls = []

        for i in range(
            await anchors.count()
        ):

            href = await anchors.nth(i).get_attribute(
                "href"
            )

            if not href:
                continue

            absolute_url = urljoin(
                SHOP_URL,
                href
            )

            # Keep only actual product URLs.
            if "/product/" not in absolute_url:
                continue

            urls.append(
                absolute_url
            )

        # Remove duplicates while preserving order.
        urls = list(
            dict.fromkeys(urls)
        )

        print(
            f"✅ {len(urls)} unique products found"
        )

        return urls

    except Exception as e:

        print(
            f"❌ Category indexing failed: {e}"
        )

        return []


async def get_first_text(page, selectors):
    """
    Return the first non-empty text found
    from the supplied selectors.
    """

    for selector in selectors:

        try:

            locator = page.locator(
                selector
            ).first

            if await locator.count() == 0:
                continue

            text = await locator.text_content()

            text = clean_text(text)

            if text:
                return text

        except Exception:
            continue

    return None


async def get_first_attribute(
    page,
    selectors,
    attribute
):
    """
    Return the first non-empty attribute
    found from the supplied selectors.
    """

    for selector in selectors:

        try:

            locator = page.locator(
                selector
            ).first

            if await locator.count() == 0:
                continue

            value = await locator.get_attribute(
                attribute
            )

            if value:
                return value.strip()

        except Exception:
            continue

    return None


async def scrape_product(
    page,
    url,
    sub_category
):
    try:

        print(
            f"   🔎 {url}"
        )

        await page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=60000
        )

        await close_popups(page)

        # --------------------------------------------------
        # Product Name
        # --------------------------------------------------

        name = await get_first_text(
            page,
            [
                "h1.product_title",
                "h1.entry-title"
            ]
        )

        if not name:

            print(
                f"⚠️ Product name missing: {url}"
            )

            return None

        # --------------------------------------------------
        # Brand
        #
        # ComputerAge product pages expose manufacturer
        # information in Additional Information.
        # --------------------------------------------------

        brand = None

        manufacturer_selectors = [
            "tr:has(th:has-text('MANUFACTURER')) td",
            "tr:has(td:has-text('MANUFACTURER')) td",
            ".woocommerce-product-attributes-item--attribute_pa_manufacturer .woocommerce-product-attributes-item__value"
        ]

        for selector in manufacturer_selectors:

            try:

                locator = page.locator(
                    selector
                ).first

                if await locator.count() == 0:
                    continue

                text = await locator.text_content()

                text = clean_text(text)

                if text and text.upper() != "MANUFACTURER":
                    brand = text
                    break

            except Exception:
                continue

        # Fallback to existing normalization utility.
        if not brand:
            brand = normalize_brand(
                name.split()[0]
            )
        else:
            brand = normalize_brand(
                brand
            )

        # --------------------------------------------------
        # Current Price
        # --------------------------------------------------

        price = None

        current_price_selectors = [
            ".summary p.price ins .woocommerce-Price-amount",
            ".summary p.price > .woocommerce-Price-amount",
            ".summary .price .woocommerce-Price-amount"
        ]

        for selector in current_price_selectors:

            try:

                locator = page.locator(
                    selector
                ).last

                if await locator.count() == 0:
                    continue

                text = await locator.text_content()

                value = clean_price(text)

                if value is not None:
                    price = value
                    break

            except Exception:
                continue

        if price is None:

            print(
                f"⚠️ Price missing: {url}"
            )

            return None

        # --------------------------------------------------
        # Previous Price
        #
        # ComputerAge uses <del> for the old price when
        # a product is discounted.
        # --------------------------------------------------

        previous_price = None

        previous_price_selectors = [
            ".summary p.price del .woocommerce-Price-amount",
            ".summary p.price del"
        ]

        for selector in previous_price_selectors:

            try:

                locator = page.locator(
                    selector
                ).first

                if await locator.count() == 0:
                    continue

                text = await locator.text_content()

                value = clean_price(text)

                if value is not None:
                    previous_price = value
                    break

            except Exception:
                continue

        # --------------------------------------------------
        # Availability
        # --------------------------------------------------

        body_text = clean_text(
            await page.locator(
                "body"
            ).inner_text()
        ) or ""

        body_lower = body_text.lower()

        is_available = True

        if (
            "out of stock" in body_lower
            or "sold out" in body_lower
        ):
            is_available = False

        # WooCommerce stock element gives us a more
        # specific signal when present.
        stock_locator = page.locator(
            ".summary p.stock"
        ).first

        if await stock_locator.count() > 0:

            stock_text = clean_text(
                await stock_locator.text_content()
            )

            if stock_text:

                stock_lower = stock_text.lower()

                if (
                    "out of stock" in stock_lower
                    or "sold out" in stock_lower
                ):
                    is_available = False

                elif "in stock" in stock_lower:
                    is_available = True

        # --------------------------------------------------
        # Image
        # --------------------------------------------------

        image_url = await get_first_attribute(
            page,
            [
                ".woocommerce-product-gallery__image img",
                ".woocommerce-product-gallery img"
            ],
            "data-large_image"
        )

        if not image_url:

            image_url = await get_first_attribute(
                page,
                [
                    ".woocommerce-product-gallery__image img",
                    ".woocommerce-product-gallery img"
                ],
                "src"
            )

        if image_url:
            image_url = urljoin(
                SHOP_URL,
                image_url
            )

        # --------------------------------------------------
        # SKU
        # --------------------------------------------------

        sku = None

        sku_locator = page.locator(
            ".sku"
        ).first

        if await sku_locator.count() > 0:

            sku = clean_text(
                await sku_locator.text_content()
            )

        if not sku:

            sku_match = re.search(
                r"\bSKU\s*[:#]?\s*([A-Za-z0-9._/-]+)",
                body_text,
                re.IGNORECASE
            )

            if sku_match:
                sku = sku_match.group(1)

        # --------------------------------------------------
        # Description
        #
        # ComputerAge currently publishes structured
        # descriptions/specifications on its product pages.
        # --------------------------------------------------

        description = None

        description_selectors = [
            "#tab-description",
            ".woocommerce-Tabs-panel--description",
            ".woocommerce-product-details__short-description"
        ]

        for selector in description_selectors:

            try:

                locator = page.locator(
                    selector
                ).first

                if await locator.count() == 0:
                    continue

                text = clean_text(
                    await locator.inner_text()
                )

                if text:
                    description = text
                    break

            except Exception:
                continue

        if not description:
            description = name

        # --------------------------------------------------
        # Model Number
        # --------------------------------------------------

        model_number = extract_model_number(
            name,
            brand,
            sub_category
        )

        # --------------------------------------------------
        # Variant
        # --------------------------------------------------

        variant_value = extract_variant_value(
            name,
            sub_category
        )

        # --------------------------------------------------
        # Product object
        # --------------------------------------------------

        return {
            "name": name,
            "brand": brand,
            "modelNumber": model_number,
            "variantValue": variant_value,
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

        print(
            f"⌛ Timeout: {url}"
        )

        return None

    except Exception as e:

        print(
            f"❌ Product scraping failed: {url}"
        )
        print(e)

        return None


async def run_scraper():

    api, shop_id = initialize_shop(
        SHOP_NAME,
        SHOP_URL,
        SHOP_LOGO
    )

    async with async_playwright() as p:

        browser = await p.chromium.launch(
            headless=True
        )

        listing_page = await browser.new_page()

        product_page = await browser.new_page()

        try:

            for category_url, (
                category,
                sub_category
            ) in CATEGORIES.items():

                print("\n" + "=" * 70)

                print(
                    f"📂 ComputerAge | "
                    f"{sub_category}"
                )

                print("=" * 70)

                product_urls = (
                    await collect_product_urls(
                        listing_page,
                        category_url
                    )
                )

                print(
                    f"📦 {sub_category}: "
                    f"{len(product_urls)} products"
                )

                for index, product_url in enumerate(
                    product_urls,
                    start=1
                ):

                    print(
                        f"\n[{index}/{len(product_urls)}]"
                    )

                    product = await scrape_product(
                        product_page,
                        product_url,
                        sub_category
                    )

                    if not product:
                        continue

                    product = add_product_metadata(
                        product,
                        shop_id,
                        category,
                        sub_category
                    )

                    api.save_product(
                        product
                    )

                    # Small delay between product pages.
                    await asyncio.sleep(0.5)

        finally:

            await product_page.close()
            await listing_page.close()
            await browser.close()

    print(
        "\n✅ ComputerAge scraping completed."
    )


if __name__ == "__main__":
    asyncio.run(
        run_scraper()
    )