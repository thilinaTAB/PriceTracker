import requests
from bs4 import BeautifulSoup
import json
import time
from urllib.parse import urljoin, urlparse, parse_qs, urlencode

from utils.scraper_utils import (
    add_product_metadata,
    initialize_shop
)

from utils.llm_client import (
    extract_model_number,
    extract_variant_value,
    normalize_brand
)


SHOP_NAME = "Chama Computers"
SHOP_URL = "https://www.chamacomputers.lk"
SHOP_LOGO = "https://www.chamacomputers.lk/img/LOGO_White.png"


CATEGORIES = {

    # "https://www.chamacomputers.lk/products/processors":
    #     ("ELECTRONICS", "PROCESSOR"),

    "https://www.chamacomputers.lk/products/monitors%20&%20displays":
        ("ELECTRONICS", "MONITOR"),

    "https://www.chamacomputers.lk/products/memory":
        ("ELECTRONICS", "RAM"),

    "https://www.chamacomputers.lk/products/thermal%20paste":
        ("ELECTRONICS", "OTHER_COMPONENTS"),

    "https://www.chamacomputers.lk/products/motherboards":
        ("ELECTRONICS", "MOTHERBOARD"),

    "https://www.chamacomputers.lk/products/ssd":
        ("ELECTRONICS", "STORAGE"),

    "https://www.chamacomputers.lk/products/storage":
        ("ELECTRONICS", "STORAGE"),

    "https://www.chamacomputers.lk/products/graphics%20cards":
        ("ELECTRONICS", "GRAPHICS_CARD"),

    "https://www.chamacomputers.lk/products/power%20supply":
        ("ELECTRONICS", "POWER_SUPPLY_UPS"),

    "https://www.chamacomputers.lk/products/pc%20cases":
        ("ELECTRONICS", "CASING"),

    "https://www.chamacomputers.lk/products/coolers":
        ("ELECTRONICS", "OTHER_COMPONENTS"),

    "https://www.chamacomputers.lk/products/keyboards"
    "?minuwangoda=true&kandy=true&colombo=true":
        ("ELECTRONICS", "OTHER_COMPONENTS"),

    "https://www.chamacomputers.lk/products/mouse"
    "?minuwangoda=true&kandy=true&colombo=true":
        ("ELECTRONICS", "OTHER_COMPONENTS"),

    "https://www.chamacomputers.lk/products/mouse%20pad"
    "?minuwangoda=true&kandy=true&colombo=true":
        ("ELECTRONICS", "OTHER_COMPONENTS")
}


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


# ==========================================================
# PRICE
# ==========================================================

def clean_price(price_text):
    if not price_text:
        return None

    try:
        return float(
            str(price_text)
            .strip()
            .replace(",", "")
            .replace("LKR", "")
            .replace("Rs.", "")
            .replace("Rs", "")
            .strip()
        )

    except ValueError:
        return None


# ==========================================================
# PAGINATION URL
# ==========================================================

def build_page_url(category_url, page_num):
    """
    Safely add/update the page parameter.

    This is important for categories such as:

        /products/monitors%20&%20displays

    and categories that already contain query parameters:

        ?minuwangoda=true&kandy=true&colombo=true
    """

    parsed = urlparse(category_url)

    query = parse_qs(
        parsed.query,
        keep_blank_values=True
    )

    query["page"] = [str(page_num)]

    new_query = urlencode(
        query,
        doseq=True
    )

    return parsed._replace(
        query=new_query
    ).geturl()


# ==========================================================
# CATEGORY PAGE
# ==========================================================

def scrape_category_page(category_url, page_num):
    print(f"📄 Scraping category: {category_url} page {page_num}")

    url = build_page_url(category_url, page_num)

    try:
        response = requests.get(
            url,
            headers=HEADERS,
            timeout=20
        )

        response.raise_for_status()

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )

        product_links = []

        # --------------------------------------------------
        # Find all links that point to Chama product pages
        # --------------------------------------------------

        for link in soup.find_all("a", href=True):

            href = link.get("href")

            if not href:
                continue

            absolute_url = urljoin(
                SHOP_URL,
                href
            )

            parsed = urlparse(
                absolute_url
            )

            path = parsed.path.rstrip("/")

            # Chama product URLs have the form:
            #
            # /products/<category>/<product-slug>
            #
            # We only need to make sure this is actually
            # a product URL, not the category URL itself.

            if not path.startswith("/products/"):
                continue

            parts = [
                part
                for part in path.split("/")
                if part
            ]

            # We need:
            #
            # products / category / product
            #
            if len(parts) < 3:
                continue

            product_slug = parts[-1]

            # Ignore obvious non-product links
            ignored_slugs = {
                "products",
                "search",
                "cart",
                "checkout",
                "login",
                "register"
            }

            if product_slug.lower() in ignored_slugs:
                continue

            # --------------------------------------------------
            # Keep only links that look like actual products
            # --------------------------------------------------

            # Product cards normally contain product-related
            # elements/text. We therefore check the anchor
            # itself and nearby product information.

            anchor_text = (
                link.get_text(" ", strip=True)
                or ""
            ).lower()

            href_lower = absolute_url.lower()

            # Avoid navigation/category links.
            if (
                "/products/monitors%20&%20displays"
                in href_lower
                and len(parts) == 2
            ):
                continue

            # Accept the product URL.
            product_links.append(
                absolute_url
            )

        # --------------------------------------------------
        # Remove duplicates
        # --------------------------------------------------

        product_links = list(
            dict.fromkeys(
                product_links
            )
        )

        print(
            f"   🔗 Found "
            f"{len(product_links)} product links"
        )

        return product_links

    except requests.RequestException as e:

        print(
            f"❌ HTTP error indexing category: {e}"
        )

        return []

    except Exception as e:

        print(
            f"❌ Error indexing category layout grid: {e}"
        )

        return []


# ==========================================================
# PRODUCT SCRAPER
# ==========================================================

def scrape_product(
    product_path,
    sub_category
):

    try:

        # --------------------------------------------------
        # Build URL
        # --------------------------------------------------

        if product_path.startswith("http"):

            url = product_path

        else:

            url = urljoin(
                SHOP_URL,
                product_path
            )

        print(
            f"   🔎 Scraping: {url}"
        )

        response = requests.get(
            url,
            headers=HEADERS,
            timeout=20
        )

        response.raise_for_status()

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )

        # --------------------------------------------------
        # JSON-LD PRODUCT DATA
        # --------------------------------------------------

        scripts = soup.find_all(
            "script",
            type="application/ld+json"
        )

        product_data = None

        for script in scripts:

            try:

                if not script.string:
                    continue

                data = json.loads(
                    script.string
                )

                # Sometimes JSON-LD can be a list.
                if isinstance(data, list):

                    for item in data:

                        if (
                            isinstance(item, dict)
                            and item.get("@type") == "Product"
                        ):

                            product_data = item
                            break

                elif isinstance(data, dict):

                    if data.get("@type") == "Product":

                        product_data = data

                    # Handle @graph structures.
                    elif isinstance(
                        data.get("@graph"),
                        list
                    ):

                        for item in data["@graph"]:

                            if (
                                isinstance(item, dict)
                                and item.get("@type") == "Product"
                            ):

                                product_data = item
                                break

                if product_data:
                    break

            except (
                json.JSONDecodeError,
                TypeError
            ):

                continue

        if not product_data:

            print(
                f"⚠️ Skipping {url} "
                f"— no product JSON-LD found"
            )

            return None

        # --------------------------------------------------
        # NAME
        # --------------------------------------------------

        name = product_data.get(
            "name"
        )

        if isinstance(name, str):
            name = name.strip()

        # --------------------------------------------------
        # BRAND
        # --------------------------------------------------

        brand_data = product_data.get(
            "brand"
        )

        brand = None

        if isinstance(
            brand_data,
            dict
        ):

            brand = brand_data.get(
                "name"
            )

        elif isinstance(
            brand_data,
            str
        ):

            brand = brand_data

        if brand == SHOP_NAME:

            brand = None

        brand = normalize_brand(
            brand
        )

        # --------------------------------------------------
        # SKU
        # --------------------------------------------------

        sku = product_data.get(
            "sku"
        )

        # --------------------------------------------------
        # IMAGE
        # --------------------------------------------------

        image = product_data.get(
            "image"
        )

        if isinstance(
            image,
            list
        ):

            image = (
                image[0]
                if image
                else None
            )

        if image:

            image = urljoin(
                SHOP_URL,
                image
            )

        # --------------------------------------------------
        # OFFERS
        # --------------------------------------------------

        offers = product_data.get(
            "offers",
            {}
        )

        # Some JSON-LD implementations return
        # offers as a list.
        if isinstance(
            offers,
            list
        ):

            offers = (
                offers[0]
                if offers
                else {}
            )

        if not isinstance(
            offers,
            dict
        ):

            offers = {}

        # --------------------------------------------------
        # PRICE
        # --------------------------------------------------

        price = clean_price(
            offers.get("price")
        )

        # --------------------------------------------------
        # AVAILABILITY
        # --------------------------------------------------

        availability = str(
            offers.get(
                "availability",
                ""
            )
        ).strip()

        availability_lower = (
            availability.lower()
        )

        # JSON-LD normally provides values such as:
        #
        # https://schema.org/InStock
        # https://schema.org/OutOfStock
        #
        # We check the final status value rather than using
        # a loose "InStock" substring test.

        if (
            "outofstock" in availability_lower
            or "out_of_stock" in availability_lower
        ):

            is_available = False

        elif (
            "instock" in availability_lower
            or "in_stock" in availability_lower
        ):

            is_available = True

        else:

            # --------------------------------------------------
            # FALLBACK AVAILABILITY
            # --------------------------------------------------
            #
            # If JSON-LD does not provide availability,
            # inspect the product page only.
            #
            # We do NOT inspect unrelated category pages.
            #

            page_text = soup.get_text(
                " ",
                strip=True
            ).lower()

            if (
                "out of stock" in page_text
                or "sold out" in page_text
            ):

                is_available = False

            else:

                is_available = True

        # --------------------------------------------------
        # VALIDATION
        # --------------------------------------------------

        if not name or price is None:

            print(
                f"⚠️ Skipping {url} "
                f"— missing name or price"
            )

            return None

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
        # DESCRIPTION
        # --------------------------------------------------

        description = None

        description_selectors = [
            ".product-description",
            ".description",
            ".product-details",
            "[class*='description']"
        ]

        for selector in description_selectors:

            element = soup.select_one(
                selector
            )

            if not element:
                continue

            text = element.get_text(
                " ",
                strip=True
            )

            if text:

                description = text

                break

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
            "previousPrice": None,
            "imageUrl": image,
            "sourceUrl": url,
            "isPromotion": False,
            "isAvailable": is_available,
            "description": description
        }

        print(
            f"      🏷️ {name}"
        )

        print(
            f"      💰 Price: {price}"
        )

        print(
            f"      📦 Availability: "
            f"{'AVAILABLE' if is_available else 'OUT OF STOCK'}"
        )

        return product

    except requests.RequestException as e:

        print(
            f"❌ HTTP error scraping "
            f"{product_path}: {e}"
        )

        return None

    except Exception as e:

        print(
            f"❌ Error scraping "
            f"{product_path}: {e}"
        )

        return None


# ==========================================================
# MAIN
# ==========================================================

def run_scraper():

    api, shop_id = initialize_shop(
        SHOP_NAME,
        SHOP_URL,
        SHOP_LOGO
    )

    # ------------------------------------------------------
    # CATEGORY LOOP
    # ------------------------------------------------------

    for category_url, (
        category,
        sub_category
    ) in CATEGORIES.items():

        print(
            "\n" + "=" * 70
        )

        print(
            f"📂 Category: {sub_category}"
        )

        print(
            f"🔗 {category_url}"
        )

        print(
            "=" * 70
        )

        page_num = 1

        all_urls = []

        # --------------------------------------------------
        # PAGINATION
        # --------------------------------------------------

        while True:

            found_urls = scrape_category_page(
                category_url,
                page_num
            )

            if not found_urls:

                print(
                    f"🛑 No products found on page "
                    f"{page_num}. Stopping pagination."
                )

                break

            old_count = len(
                all_urls
            )

            all_urls = list(
                dict.fromkeys(
                    all_urls + found_urls
                )
            )

            new_count = len(
                all_urls
            )

            print(
                f"   📊 Unique products so far: "
                f"{new_count}"
            )

            # --------------------------------------------------
            # INFINITE LOOP GUARD
            # --------------------------------------------------

            if new_count == old_count:

                print(
                    "🛑 No new products found. "
                    "Stopping pagination."
                )

                break

            page_num += 1

            time.sleep(
                0.5
            )

        print(
            f"\n📦 Total products found for "
            f"[{sub_category}]: "
            f"{len(all_urls)}"
        )

        # --------------------------------------------------
        # PRODUCT LOOP
        # --------------------------------------------------

        for index, product_path in enumerate(
            all_urls,
            start=1
        ):

            print(
                f"\n[{index}/{len(all_urls)}]"
            )

            product = scrape_product(
                product_path,
                sub_category
            )

            if product:

                product = add_product_metadata(
                    product,
                    shop_id,
                    category,
                    sub_category
                )

                api.save_product(
                    product
                )

            time.sleep(
                1
            )

    print(
        "\n" + "=" * 70
    )

    print(
        "✅ Chama scraping complete"
    )

    print(
        "=" * 70
    )


if __name__ == "__main__":

    run_scraper()