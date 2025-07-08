import React, { useState } from "react";
import { createUser } from "../api/createUser";

// ✅ Accept refreshTeam as a prop
const AddUserForm = ({ refreshTeam }: { refreshTeam: () => void }) => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const result = await createUser(email, password, role, fullName);
    setLoading(false);
    setMessage(result.message || "Unknown result");

    if (result.success) {
      // ✅ Clear input fields
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("user");

      // ✅ Trigger re-fetch of team members
      refreshTeam();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 max-w-md">
      <input
        type="text"
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        className="border p-2 w-full"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="border p-2 w-full"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="border p-2 w-full"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="border p-2 w-full"
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded w-full"
        disabled={loading}
      >
        {loading ? "Creating..." : "Add User"}
      </button>
      {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
    </form>
  );
};

export default AddUserForm;
