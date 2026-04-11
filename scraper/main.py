import asyncio
from scrapers.mahajana_scraper import run_scraper

if __name__ == "__main__":
    print("🚀 Starting PriceTracker scraper...")
    asyncio.run(run_scraper())
    print("✅ Done")