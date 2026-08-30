import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* BRAND */}
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-blue-500/40 flex items-center justify-center">
                <svg
                  viewBox="0 0 48 48"
                  className="w-7 h-7 text-blue-500"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3 25H11L15 13L21 35L27 17L31 25H45"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <span className="text-2xl font-black">
                <span className="text-white">Price</span>
                <span className="text-blue-500">Pulse</span>
              </span>
            </Link>

            <p className="text-gray-500 text-sm mt-3 max-w-sm leading-6">
              Track prices, compare PC components, and make smarter purchasing
              decisions across Sri Lankan retailers.
            </p>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">
              Quick Links
            </h3>

            <nav className="space-y-2 text-sm">
              <Link
                to="/"
                className="block text-gray-500 hover:text-blue-400 transition-colors"
              >
                Home
              </Link>

              <Link
                to="/wishlist"
                className="block text-gray-500 hover:text-blue-400 transition-colors"
              >
                Wishlist
              </Link>

              <Link
                to="/login"
                className="block text-gray-500 hover:text-blue-400 transition-colors"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="block text-gray-500 hover:text-blue-400 transition-colors"
              >
                Register
              </Link>
            </nav>
          </div>

          {/* ABOUT */}
          <div>
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">
              PricePulse
            </h3>

            <p className="text-gray-500 text-sm leading-6">
              A web-based PC component price comparison and monitoring platform
              designed to help users compare retailer offers in Sri Lanka.
            </p>
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            © 2026 PricePulse. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
