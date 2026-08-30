import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getProfile, updateProfile } from "../api/profile";
import { Link } from "react-router-dom";

function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [memberSince, setMemberSince] = useState("");

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getProfile();

        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setEmail(profile.email);
        setMemberSince(profile.createdAt);
      } catch {
        setError("Unable to load profile details.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (!user) {
    return null;
  }

  const currentUser = user;

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updatedProfile = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      updateUser({
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
      });

      setFirstName(updatedProfile.firstName);
      setLastName(updatedProfile.lastName);
      setEditing(false);
    } catch {
      setError("Unable to update your name. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setFirstName(currentUser.firstName);
    setLastName(currentUser.lastName);
    setError("");
    setEditing(false);
  }

  function formatMemberSince(date: string) {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* PROFILE HEADER */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-14 text-center">
          <h1 className="text-4xl font-bold mb-3">My Profile</h1>

          <p className="text-gray-400">View and manage your account details</p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* PROFILE DETAILS */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
            {/* AVATAR */}
            <div className="border-b md:border-b-0 md:border-r border-gray-800 p-8 flex flex-col items-center justify-center">
              <div className="w-40 h-40 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                <svg
                  viewBox="0 0 100 100"
                  className="w-28 h-28 text-gray-400"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle cx="50" cy="35" r="17" fill="currentColor" />

                  <path
                    d="M20 82C20 64 33 54 50 54C67 54 80 64 80 82"
                    fill="currentColor"
                  />
                </svg>
              </div>

              <h2 className="text-xl font-bold mt-6 text-center">
                {firstName} {lastName}
              </h2>

              <p className="text-gray-500 text-sm mt-2">
                Member since{" "}
                {memberSince
                  ? new Date(memberSince).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>

            {/* DETAILS */}
            <div className="p-8">
              <h2 className="text-xl font-bold mb-7">Profile Details</h2>

              {loading ? (
                <p className="text-gray-400">Loading profile...</p>
              ) : (
                <div className="space-y-6">
                  {/* FIRST NAME */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-800 pb-5">
                    <div>
                      <p className="text-sm text-gray-500">First Name</p>

                      <p className="text-base text-white mt-1">{firstName}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors"
                    >
                      Edit
                    </button>
                  </div>

                  {/* LAST NAME */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-800 pb-5">
                    <div>
                      <p className="text-sm text-gray-500">Last Name</p>

                      <p className="text-base text-white mt-1">{lastName}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors"
                    >
                      Edit
                    </button>
                  </div>

                  {/* EMAIL */}
                  <div className="border-b border-gray-800 pb-5">
                    <div className="text-left">
                      <p className="text-sm text-gray-500">Email</p>

                      <p className="text-base text-white mt-1">{email}</p>
                    </div>
                  </div>

                  {/* MEMBER SINCE */}
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>

                    <p className="text-base text-white mt-1">
                      {formatMemberSince(memberSince)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CHANGE NAME */}
        {editing && (
          <section className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl font-bold">Change Name</h2>

            <p className="text-gray-400 text-sm mt-1 mb-6">
              Update your first or last name
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* FIRST NAME */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  First Name
                </label>

                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  disabled={saving}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              {/* LAST NAME */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Last Name
                </label>

                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={saving}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-3 mt-7">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        )}
      </main>
      {/* Back Link */}
      <Link
        to="/"
        className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors mb-6 inline-block"
      >
        ← Back to Catalog Dashboard
      </Link>
    </div>
  );
}

export default ProfilePage;
