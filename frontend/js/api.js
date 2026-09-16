function getApiBaseUrl() {
  if (window.LOCATION_BACKEND_URL) return window.LOCATION_BACKEND_URL;
  const isLocal = window.location.hostname === "localhost" || 
                  window.location.hostname === "127.0.0.1" || 
                  window.location.protocol === "file:";
  return isLocal ? "http://localhost:8000/api" : (window.location.origin ? `${window.location.origin}/api` : "/api");
}

class ApiClient {
  static getToken() {
    return localStorage.getItem("auth_token");
  }

  static setToken(token) {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }

  static getUser() {
    const userStr = localStorage.getItem("user_info");
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  }

  static setUser(user) {
    if (user) {
      localStorage.setItem("user_info", JSON.stringify(user));
    } else {
      localStorage.removeItem("user_info");
    }
  }

  static async request(endpoint, options = {}) {
    const baseUrl = getApiBaseUrl();
    const primaryUrl = `${baseUrl}${endpoint}`;
    const token = ApiClient.getToken();

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    // Candidate URLs to attempt in order
    const urlsToTry = [primaryUrl];
    if (!primaryUrl.includes("localhost:8000")) {
      urlsToTry.push(`http://localhost:8000/api${endpoint}`);
    }
    if (!primaryUrl.endsWith(`/api${endpoint}`) && window.location.origin) {
      urlsToTry.push(`${window.location.origin}/api${endpoint}`);
    }

    let lastError = null;
    for (const targetUrl of urlsToTry) {
      try {
        const response = await fetch(targetUrl, config);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMsg = data.detail || data.message || `Server Error (${response.status})`;
          throw new Error(errorMsg);
        }

        return data;
      } catch (err) {
        lastError = err;
        console.warn(`API attempt failed on [${options.method || "GET"} ${targetUrl}]:`, err);
        // If it's an explicit HTTP status error (e.g. 400, 401, 404), don't try other hosts
        if (err.message && err.message.includes("Server Error")) {
          throw err;
        }
      }
    }

    console.error(`All API endpoints failed for [${options.method || "GET"} ${endpoint}]`);
    throw lastError || new Error("Failed to connect to backend server.");
  }

  static get(endpoint) {
    return ApiClient.request(endpoint, { method: "GET" });
  }

  static post(endpoint, body) {
    return ApiClient.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  static patch(endpoint, body = {}) {
    return ApiClient.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body)
    });
  }

  static delete(endpoint) {
    return ApiClient.request(endpoint, { method: "DELETE" });
  }
}

window.ApiClient = ApiClient;
