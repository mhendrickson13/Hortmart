import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      // Public landing: allow anonymous users to browse published courses.
      navigate("/courses", { replace: true });
    } else if (user.role === "ADMIN" || user.role === "CREATOR") {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/courses", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return null;
}
