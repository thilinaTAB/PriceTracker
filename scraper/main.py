import asyncio
from scrapers.nanotek_scraper import run_scraper

if __name__ == "__main__":
    print("🚀 Starting PriceTracker scraper...")
    asyncio.run(run_scraper())
    print("✅ Done")