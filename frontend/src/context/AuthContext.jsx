import { createContext, useContext, useState, useEffect } from "react";
import api, { getToken, clearToken } from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const userData = response.data;
        
        if (userData.role === 'teacher' && userData.staff_id) {
            try {
                const staffRes = await api.get(`/staff/${userData.staff_id}`);
                userData.staff_profile = staffRes.data;
            } catch (staffErr) {
                console.error("Failed to fetch staff profile", staffErr);
            }
        }
        
        setUser(userData);
      } catch (err) {
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const logout = () => {
    clearToken();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
