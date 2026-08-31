import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register({
        firstName,
        lastName,
        email,
        password,
      });

      navigate("/");
    } catch {
      setError(
        "Registration failed. Email may already be in use, or password is under 8 characters.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-6">
      <h1 className="text-2xl font-bold mb-6">Register</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* FIRST NAME */}
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="border rounded px-3 py-2"
        />

        {/* LAST NAME */}
        <input
          type="text"
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          className="border rounded px-3 py-2"
        />

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={`border rounded px-3 py-2 ${
            email && !isValidEmail(email) ? "border-red-500" : ""
          }`}
        />

        {email && !isValidEmail(email) && (
          <p className="text-red-600 text-sm -mt-2">
            Please enter a valid email address.
          </p>
        )}

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="border rounded px-3 py-2"
        />

        {/* CONFIRM PASSWORD */}
        <input
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className={`border rounded px-3 py-2 ${
            confirmPassword && password !== confirmPassword
              ? "border-red-500"
              : ""
          }`}
        />

        {/* PASSWORD MATCH MESSAGE */}
        {confirmPassword && password !== confirmPassword && (
          <p className="text-red-600 text-sm -mt-2">Passwords do not match.</p>
        )}

        {/* ERROR */}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* REGISTER BUTTON */}
        <button
          type="submit"
          disabled={loading || password !== confirmPassword}
          className="bg-green-900 text-white rounded px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link to="/login" className="underline">
          Login
        </Link>
      </p>
      <br />
      <br />
    </div>
  );
}

export default RegisterPage;
