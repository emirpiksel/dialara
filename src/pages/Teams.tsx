import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import AddUserForm from "../components/AddUserForm";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";

interface TeamMember {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
}

export function Teams() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const { isAuthenticated, isAdmin, userId } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/dashboard");
    } else if (!isAdmin) {
      navigate("/dashboard");
    } else {
      fetchTeamMembers();
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const fetchTeamMembers = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("users")
      .select("id, email, role, full_name")
      .eq("admin_id", userId)  // Now filtering by user_id (admin_id)
      .order("role", { ascending: true });

    if (error) {
      console.error("Error fetching team members:", error);
    } else {
      setTeamMembers(data || []);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      alert("Failed to update role: " + error.message);
    } else {
      fetchTeamMembers();  // Refresh the team list after role change
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Your Team</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Team Members List */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Team Members</h2>
          {teamMembers.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {teamMembers.map((user) => (
                <li key={user.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No team members found.</p>
          )}
        </div>

        {/* Right: Add User Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <AddUserForm refreshTeam={fetchTeamMembers} />
        </div>
      </div>
    </div>
  );
}
