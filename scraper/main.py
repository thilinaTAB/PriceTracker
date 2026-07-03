import asyncio
from scrapers.nanotek_scraper import run_scraper as nanotek_scraper
from scrapers.chama_scraper import run_scraper as chama_scraper
from scrapers.gamestreet_scraper import run_scraper as gamestreet_scraper

if __name__ == "__main__":
    print("🚀 Starting PriceTracker scraper...")

    print("\n🔷 Running Nanotek scraper...")
    asyncio.run(nanotek_scraper())

    print("\n🔷 Running Chama scraper...")
    chama_scraper()

    print("\n🔷 Running Game Street scraper...")
    gamestreet_scraper()

    print("\n✅ All scrapers done")