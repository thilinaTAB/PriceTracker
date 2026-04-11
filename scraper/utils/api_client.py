import requests
import os
from dotenv import load_dotenv

load_dotenv()

class ApiClient:
    def __init__(self):
        self.base_url = os.getenv("API_BASE_URL")
        self.token = None

        # Verify .env loaded correctly
        if not self.base_url:
            raise Exception("API_BASE_URL not found in .env file")

        print(f"🔗 Connecting to API: {self.base_url}")
        self._login()

    def _login(self):
        response = requests.post(
            f"{self.base_url}/api/v1/auth/login",
            json={
                "email": os.getenv("API_EMAIL"),
                "password": os.getenv("API_PASSWORD")
            }
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            print("✅ API login successful")
        else:
            raise Exception(f"❌ API login failed: {response.text}")

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def get_or_create_shop(self, name, website_url, logo_url):
        response = requests.get(
            f"{self.base_url}/api/v1/shops",
            headers=self._headers()
        )
        shops = response.json()
        for shop in shops:
            if shop["name"] == name:
                print(f"✅ Shop found: {name}")
                return shop["id"]

        response = requests.post(
            f"{self.base_url}/api/v1/shops",
            headers=self._headers(),
            json={
                "name": name,
                "websiteUrl": website_url,
                "logoUrl": logo_url,
                "active": True
            }
        )
        if response.status_code == 201:
            print(f"✅ Shop created: {name}")
            return response.json()["id"]
        else:
            raise Exception(f"❌ Failed to create shop: {response.text}")

    def save_product(self, product_data):
        # We don't check if it exists anymore.
        # We just send it to the new /sync endpoint and let Spring Boot figure it out.
        response = requests.post(
            f"{self.base_url}/api/v1/products/sync",
            headers=self._headers(),
            json=product_data
        )

        if response.status_code == 200:
            print(f"✅ Synced: {product_data['name']} — Rs {product_data['price']}")
            return True
        else:
            print(f"❌ Failed to sync: {product_data['name']} → {response.text}")
            return False