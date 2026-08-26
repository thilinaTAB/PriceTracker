from utils.api_client import ApiClient


def add_product_metadata(
    product,
    shop_id,
    category,
    sub_category
):
    product["shopId"] = shop_id
    product["category"] = category
    product["subCategory"] = sub_category

    return product


def initialize_shop(shop_name, shop_url, shop_logo):
    api = ApiClient()
    shop_id = api.get_or_create_shop(
        shop_name,
        shop_url,
        shop_logo
    )

    return api, shop_id