/* API Client Helper for AI Mathematics Visual Solver */
const API_BASE_URL = window.LOCATION_BACKEND_URL || "http://localhost:8000/api";

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
    const url = `${API_BASE_URL}${endpoint}`;
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

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.detail || data.message || `Server Error (${response.status})`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || "GET"} ${endpoint}]:`, err);
      throw err;
    }
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
