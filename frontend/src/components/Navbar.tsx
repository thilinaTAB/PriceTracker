function Navbar() {
  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
      <span className="text-xl font-bold">PriceTracker</span>
      <div className="flex gap-4">
        <button>Login</button>
        <button>Register</button>
      </div>
    </nav>
  )
}

export default Navbar