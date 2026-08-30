import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    const confirmed = window.confirm("Are you sure you want to logout?");

    if (!confirmed) {
      return;
    }

    logout();
    navigate("/");
  }

  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center border-b border-gray-800">
      {/* LOGO */}
      <Link to="/" className="text-xl font-bold">
        <span className="text-2xl font-black">
          <span className="text-white">Price</span>
          <span className="text-blue-500">Pulse</span>
        </span>
      </Link>

      {/* RIGHT SIDE */}
      <div className="flex gap-3 items-center">
        {user ? (
          <>
            {/* WISHLIST */}
            <Link
              to="/wishlist"
              className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 text-sm font-medium hover:bg-gray-700 hover:border-gray-600 transition-colors"
            >
              Wishlist
            </Link>

            {/* USER NAME */}
            <Link
              to="/profile"
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-800 hover:text-white transition-colors"
            >
              {user.firstName}
            </Link>

            {/* LOGOUT */}
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            {/* WISHLIST */}
            <Link
              to="/wishlist"
              className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 text-sm font-medium hover:bg-gray-700 hover:border-gray-600 transition-colors"
            >
              Wishlist
            </Link>

            {/* LOGIN */}
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg border border-blue-500 text-blue-400 text-sm font-medium hover:bg-blue-500 hover:text-white transition-colors"
            >
              Login
            </Link>

            {/* REGISTER */}
            <Link
              to="/register"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
