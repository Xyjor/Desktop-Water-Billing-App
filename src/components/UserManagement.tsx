import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Users, UserPlus, Trash2, Key, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

interface User {
  id: number;
  username: string;
  role: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create User Form State
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("OPERATOR");
  const [isCreating, setIsCreating] = useState(false);

  // Password Update Form State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updatePassword, setUpdatePassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data: User[] = await invoke("get_users");
      setUsers(data);
    } catch (e) {
      setErrorMsg(String(e));
    } finally {
      setIsLoading(false);
    }
  }

  // Create User Operator handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!newUsername.trim()) return setErrorMsg("Username is required.");
    if (!newPassword.trim()) return setErrorMsg("Password is required.");
    if (newPassword.length < 8) return setErrorMsg("Password must be at least 8 characters.");

    setIsCreating(true);
    try {
      await invoke("create_user", {
        username: newUsername.trim(),
        password: newPassword,
        role: newRole
      });

      setSuccessMsg(`Operator account "${newUsername}" created successfully!`);
      setNewUsername("");
      setNewPassword("");
      loadUsers();
    } catch (e) {
      setErrorMsg(String(e));
    } finally {
      setIsCreating(false);
    }
  };

  // Delete User Operator handler
  const handleDeleteUser = async (id: number, username: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    if (username === "admin") {
      return setErrorMsg("Security Protocol: Deletion of the primary 'admin' account is prohibited.");
    }

    if (!window.confirm(`Are you sure you want to remove operator "${username}"?`)) {
      return;
    }

    try {
      await invoke("delete_user", { id });
      setSuccessMsg(`Operator account "${username}" removed successfully.`);
      loadUsers();
      if (selectedUser?.id === id) {
        setSelectedUser(null);
      }
    } catch (e) {
      setErrorMsg(String(e));
    }
  };

  // Reset password handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedUser) return;
    if (!updatePassword.trim()) return setErrorMsg("New password cannot be empty.");
    if (updatePassword.length < 8) return setErrorMsg("Password must be at least 8 characters.");

    setIsUpdatingPassword(true);
    try {
      await invoke("update_user_password", {
        username: selectedUser.username,
        password: updatePassword
      });

      setSuccessMsg(`Password for user "${selectedUser.username}" updated successfully!`);
      setUpdatePassword("");
      setSelectedUser(null);
    } catch (e) {
      setErrorMsg(String(e));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start select-none">
      {/* Left Column - User creation panel */}
      <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <UserPlus className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider">Create Operator Account</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Register new systems representative</p>
            </div>
          </div>
          <p className="text-xs text-slate-450 font-semibold leading-relaxed">
            Register a new system user. Operators can create billing statements, reprint invoices, and search databases.
          </p>

          {/* Form Message bars */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-750 animate-pulse">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1.5">Username</label>
              <input
                type="text"
                placeholder="e.g., operator_john"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1.5">Default Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1.5">System Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150 cursor-pointer"
              >
                <option value="OPERATOR">Operator</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/10 cursor-pointer disabled:bg-slate-200"
          >
            {isCreating && <RefreshCw className="h-3 w-3 animate-spin text-emerald-200" />}
            <span>Register Operator</span>
          </button>
        </form>

        {/* Password Reset Section (Conditional render) */}
        {selectedUser && (
          <form onSubmit={handleUpdatePassword} className="border-t border-slate-100 pt-5 mt-5 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-slate-800">
              <Key className="h-4.5 w-4.5 text-blue-650" />
              <h4 className="text-xs font-black uppercase tracking-wider">Reset password for "{selectedUser.username}"</h4>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                placeholder="Enter new password"
                value={updatePassword}
                onChange={(e) => setUpdatePassword(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold focus:border-blue-500 focus:bg-white focus:outline-none transition-all duration-150"
                disabled={isUpdatingPassword}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-450 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Right Column - User Accounts Listing */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-250/30 flex items-center justify-center text-slate-600 shrink-0">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider">System Operators Registry</h3>
              <p className="text-[10px] text-slate-450 font-semibold">Active administrative credentials</p>
            </div>
          </div>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer border border-transparent hover:border-slate-200/60"
            title="Refresh Registry"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex-1 overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center items-center py-24 text-slate-400 text-xs font-semibold gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
              <span>Fetching user records...</span>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Security Role</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {users.map((user) => {
                  const isAdmin = user.role === "ADMIN";
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-905 flex items-center gap-2">
                        <span className="h-5.5 w-5.5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-extrabold uppercase select-none border border-slate-200/60">
                          {user.username.charAt(0)}
                        </span>
                        <span className="truncate max-w-[150px]">{user.username}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest ${
                          isAdmin 
                            ? "bg-blue-50 text-blue-700 border border-blue-100" 
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setUpdatePassword("");
                            setErrorMsg("");
                            setSuccessMsg("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-extrabold text-slate-650 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Reset Password"
                        >
                          <Key className="h-3.5 w-3.5 text-slate-400" />
                          <span>Reset</span>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          disabled={user.username === "admin"}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-1.5 text-[10px] font-extrabold text-red-600 hover:bg-red-50 disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors cursor-pointer"
                          title="Delete Operator Account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
