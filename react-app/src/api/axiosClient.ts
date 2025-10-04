import axios from "axios";
import { getAuth } from "firebase/auth";
import { useAppState } from "@/hooks/useAppState";

// Create a shared axios instance for the app
const metaEnv: any = (import.meta as any).env || {};
const client = axios.create({
  // Optionally configure a baseURL via env var (Vite uses VITE_ prefix)
  baseURL: metaEnv.VITE_API_BASE_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Firebase ID token to every request if available. Prefer token stored
// in the app state (useAppState) for performance; otherwise ask firebase auth.
client.interceptors.request.use(async (config) => {
  try {
    const state = useAppState.getState();
    let token = state?.authToken || null;

    if (!token) {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        token = await user.getIdToken();
      }
    }

    if (token) {
      config.headers = config.headers || {};
      // Do not overwrite an existing Authorization header if present
      if (!config.headers["Authorization"] && !config.headers["authorization"]) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    // ignore token attach failures; request will proceed unauthenticated
    // console.debug("axiosClient: could not attach token", err);
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default client;
