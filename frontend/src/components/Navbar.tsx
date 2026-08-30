import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold">
        <span className="text-2xl font-black">
          <span className="text-white">Price</span>
          <span className="text-blue-500">Pulse</span>
        </span>
      </Link>
      <div className="flex gap-4 items-center">
        {user ? (
          <>
            <Link to="/wishlist">Wishlist</Link>
            <span>{user.firstName}</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">
              <button>Login</button>
            </Link>
            <Link to="/register">
              <button>Register</button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
