import subprocess
import sys
import time
from datetime import datetime

SCRAPER_INTERVAL_HOURS = 6


def run_scraper():
    print("\n" + "=" * 70)
    print(f"🚀 Starting scheduled scraper run: {datetime.now()}")
    print("=" * 70)

    try:
        result = subprocess.run(
            [sys.executable, "main.py"],
            check=False
        )

        if result.returncode == 0:
            print("\n✅ Scheduled scraper completed successfully.")
        else:
            print(
                f"\n❌ Scheduled scraper failed "
                f"with exit code: {result.returncode}"
            )

    except Exception as e:
        print(f"\n❌ Failed to start scraper: {e}")


if __name__ == "__main__":
    print("=" * 70)
    print("⏰ PricePulse Automatic Scraper Scheduler")
    print("=" * 70)
    print(f"📅 Scraper interval: Every {SCRAPER_INTERVAL_HOURS} hours")
    print("▶️ Running first scraper immediately...")
    print("🛑 Press Ctrl+C to stop the scheduler.")
    print("=" * 70)

    while True:
        run_scraper()

        print(
            f"\n⏳ Next scraper run in "
            f"{SCRAPER_INTERVAL_HOURS} hours..."
        )

        try:
            time.sleep(SCRAPER_INTERVAL_HOURS * 60 * 60)
        except KeyboardInterrupt:
            print("\n🛑 Scheduler stopped.")
            sys.exit(0)