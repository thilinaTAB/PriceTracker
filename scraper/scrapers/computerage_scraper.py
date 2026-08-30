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

SHOP_LOGO = (
    "https://i0.wp.com/computerage.lk/wp-content/uploads/"
    "2024/07/computarage-logo-updated.png"
)


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


# ==========================================================
# GENERAL HELPERS
# ==========================================================

def clean_text(text):
    if not text:
        return None

    return re.sub(r"\s+", " ", text).strip()


def clean_price(price_text):
    if not price_text:
        return None

    text = str(price_text)

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


async def get_first_text(page, selectors):

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


# ==========================================================
# AVAILABILITY
# ==========================================================

async def detect_availability(page):

    """
    Detect the actual WooCommerce product availability.

    Priority:

    1. .summary .stock element
    2. Stock element CSS class
    3. Stock element text
    4. Add-to-cart button
    5. Product summary text only

    IMPORTANT:
    Never inspect the entire page body because unrelated
    sections can contain "out of stock" text.
    """

    print(
        "      📦 Detecting availability..."
    )

    # ------------------------------------------------------
    # 1. WooCommerce stock element
    # ------------------------------------------------------

    stock_selectors = [
        ".summary p.stock",
        ".summary .stock",
        ".summary .woocommerce-variation-availability .stock",
        ".summary .availability"
    ]

    for selector in stock_selectors:

        try:

            locator = page.locator(
                selector
            ).first

            if await locator.count() == 0:
                continue

            stock_text = clean_text(
                await locator.inner_text()
            ) or ""

            class_name = (
                await locator.get_attribute("class")
                or ""
            )

            stock_text_lower = stock_text.lower()
            class_lower = class_name.lower()

            print(
                f"      Stock element: "
                f"'{stock_text}'"
            )

            print(
                f"      Stock classes: "
                f"'{class_name}'"
            )

            # ------------------------------------------------
            # CSS class is the strongest signal
            # ------------------------------------------------

            if (
                "out-of-stock" in class_lower
                or "out_of_stock" in class_lower
            ):

                print(
                    "      ❌ OUT OF STOCK "
                    "(WooCommerce class)"
                )

                return False

            if (
                "in-stock" in class_lower
                or "in_stock" in class_lower
            ):

                print(
                    "      ✅ AVAILABLE "
                    "(WooCommerce class)"
                )

                return True

            # ------------------------------------------------
            # Text is secondary signal
            # ------------------------------------------------

            if (
                "out of stock" in stock_text_lower
                or "sold out" in stock_text_lower
                or "unavailable" in stock_text_lower
            ):

                print(
                    "      ❌ OUT OF STOCK "
                    "(stock text)"
                )

                return False

            if (
                "in stock" in stock_text_lower
                or "available" in stock_text_lower
            ):

                print(
                    "      ✅ AVAILABLE "
                    "(stock text)"
                )

                return True

        except Exception as e:

            print(
                f"      ⚠️ Stock selector error "
                f"{selector}: {e}"
            )

    # ------------------------------------------------------
    # 2. WooCommerce Add To Cart button
    # ------------------------------------------------------

    add_to_cart_selectors = [
        ".summary .single_add_to_cart_button",
        ".summary button.single_add_to_cart_button",
        ".summary button[type='submit']"
    ]

    for selector in add_to_cart_selectors:

        try:

            button = page.locator(
                selector
            ).first

            if await button.count() == 0:
                continue

            class_name = (
                await button.get_attribute("class")
                or ""
            )

            disabled = await button.is_disabled()

            class_lower = class_name.lower()

            print(
                f"      Add-to-cart classes: "
                f"'{class_name}'"
            )

            if (
                "out-of-stock" in class_lower
                or "out_of_stock" in class_lower
            ):

                print(
                    "      ❌ OUT OF STOCK "
                    "(Add-to-cart class)"
                )

                return False

            if not disabled:

                print(
                    "      ✅ AVAILABLE "
                    "(Add-to-cart enabled)"
                )

                return True

        except Exception:
            continue

    # ------------------------------------------------------
    # 3. Product summary only
    # ------------------------------------------------------

    try:

        summary = page.locator(
            ".summary"
        ).first

        if await summary.count() > 0:

            summary_text = clean_text(
                await summary.inner_text()
            ) or ""

            summary_lower = summary_text.lower()

            # Negative status first.
            if (
                "out of stock" in summary_lower
                or "sold out" in summary_lower
                or "unavailable" in summary_lower
            ):

                print(
                    "      ❌ OUT OF STOCK "
                    "(product summary)"
                )

                return False

            # Explicit positive status.
            if (
                "in stock" in summary_lower
                or "available" in summary_lower
            ):

                print(
                    "      ✅ AVAILABLE "
                    "(product summary)"
                )

                return True

    except Exception:
        pass

    # ------------------------------------------------------
    # 4. No explicit status found
    # ------------------------------------------------------

    print(
        "      ⚠️ No explicit stock status found."
    )

    print(
        "      ⚠️ Marking as AVAILABLE because "
        "the product page and valid price exist."
    )

    return True


# ==========================================================
# PRODUCT URL COLLECTION
# ==========================================================

async def collect_product_urls(
    page,
    category_url
):

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

        await page.wait_for_timeout(
            1500
        )

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

                await page.wait_for_timeout(
                    2000
                )

                new_count = await page.locator(
                    "a[href*='/product/']"
                ).count()

                if new_count <= previous_count:
                    break

        anchors = page.locator(
            "a[href*='/product/']"
        )

        urls = []

        for i in range(
            await anchors.count()
        ):

            href = await anchors.nth(
                i
            ).get_attribute(
                "href"
            )

            if not href:
                continue

            absolute_url = urljoin(
                SHOP_URL,
                href
            )

            if "/product/" not in absolute_url:
                continue

            urls.append(
                absolute_url
            )

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


# ==========================================================
# PRODUCT SCRAPER
# ==========================================================

async def scrape_product(
    page,
    url,
    sub_category
):

    try:

        print(
            f"\n   🔎 {url}"
        )

        await page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=60000
        )

        await close_popups(page)

        await page.wait_for_timeout(
            500
        )

        # --------------------------------------------------
        # PRODUCT NAME
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

        print(
            f"      🏷️ {name}"
        )

        # --------------------------------------------------
        # BRAND
        # --------------------------------------------------

        brand = None

        manufacturer_selectors = [
            "tr:has(th:has-text('MANUFACTURER')) td",
            "tr:has(td:has-text('MANUFACTURER')) td",
            ".woocommerce-product-attributes-item--attribute_pa_manufacturer "
            ".woocommerce-product-attributes-item__value"
        ]

        for selector in manufacturer_selectors:

            try:

                locator = page.locator(
                    selector
                ).first

                if await locator.count() == 0:
                    continue

                text = await locator.text_content()

                text = clean_text(
                    text
                )

                if (
                    text
                    and text.upper() != "MANUFACTURER"
                ):

                    brand = text

                    break

            except Exception:
                continue

        if not brand:

            first_word = (
                name.split()[0]
                if name.split()
                else ""
            )

            brand = normalize_brand(
                first_word
            )

        else:

            brand = normalize_brand(
                brand
            )

        # --------------------------------------------------
        # CURRENT PRICE
        # --------------------------------------------------

        price = None

        current_price_selectors = [
            ".summary p.price ins "
            ".woocommerce-Price-amount",

            ".summary p.price > "
            ".woocommerce-Price-amount",

            ".summary .price "
            ".woocommerce-Price-amount"
        ]

        for selector in current_price_selectors:

            try:

                locator = page.locator(
                    selector
                ).last

                if await locator.count() == 0:
                    continue

                text = await locator.text_content()

                value = clean_price(
                    text
                )

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

        print(
            f"      💰 Price: {price}"
        )

        # --------------------------------------------------
        # PREVIOUS PRICE
        # --------------------------------------------------

        previous_price = None

        previous_price_selectors = [
            ".summary p.price del "
            ".woocommerce-Price-amount",

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

                value = clean_price(
                    text
                )

                if value is not None:

                    previous_price = value

                    break

            except Exception:
                continue

        # --------------------------------------------------
        # AVAILABILITY
        # --------------------------------------------------

        is_available = await detect_availability(
            page
        )

        # --------------------------------------------------
        # IMAGE
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

            # Use only product-related content.
            sku_locator = page.locator(
                ".summary"
            ).first

            if await sku_locator.count() > 0:

                summary_text = clean_text(
                    await sku_locator.inner_text()
                ) or ""

                sku_match = re.search(
                    r"\bSKU\s*[:#]?\s*"
                    r"([A-Za-z0-9._/-]+)",
                    summary_text,
                    re.IGNORECASE
                )

                if sku_match:

                    sku = sku_match.group(1)

        # --------------------------------------------------
        # DESCRIPTION
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
        # MODEL NUMBER
        # --------------------------------------------------

        model_number = extract_model_number(
            name,
            brand,
            sub_category
        )

        # --------------------------------------------------
        # VARIANT
        # --------------------------------------------------

        variant_value = extract_variant_value(
            name,
            sub_category
        )

        # --------------------------------------------------
        # FINAL PRODUCT
        # --------------------------------------------------

        product = {
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

        print(
            f"      {'✅ AVAILABLE' if is_available else '❌ OUT OF STOCK'}"
        )

        return product

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


# ==========================================================
# MAIN SCRAPER
# ==========================================================

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

                print(
                    "\n" + "=" * 70
                )

                print(
                    f"📂 ComputerAge | "
                    f"{sub_category}"
                )

                print(
                    "=" * 70
                )

                product_urls = await collect_product_urls(
                    listing_page,
                    category_url
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

                    await asyncio.sleep(
                        0.5
                    )

        finally:

            await product_page.close()

            await listing_page.close()

            await browser.close()

    print(
        "\n" + "=" * 70
    )

    print(
        "✅ ComputerAge scraping completed."
    )

    print(
        "=" * 70
    )


if __name__ == "__main__":

    asyncio.run(
        run_scraper()
    )