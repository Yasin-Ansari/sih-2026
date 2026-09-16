/* Authentication & Profile Manager */

document.addEventListener("DOMContentLoaded", () => {
  AuthManager.init();
});

class AuthManager {
  static async init() {
    AuthManager.bindEvents();
    await AuthManager.checkAuth();
  }

  static bindEvents() {
    // Auth Modal Forms
    const loginForm = document.querySelector("#authViewLogin form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => AuthManager.handleLogin(e));
    }

    const signupForm = document.querySelector("#authViewSignup form");
    if (signupForm) {
      signupForm.addEventListener("submit", (e) => AuthManager.handleSignup(e));
    }

    const forgotForm = document.querySelector("#authViewForgot form");
    if (forgotForm) {
      forgotForm.addEventListener("submit", (e) => AuthManager.handleForgot(e));
    }

    // Profile Save Form
    const profileForm = document.querySelector("#viewProfile form");
    if (profileForm) {
      profileForm.addEventListener("submit", (e) => AuthManager.handleProfileSave(e));
    }
  }

  static async checkAuth() {
    const token = ApiClient.getToken();
    if (!token) {
      AuthManager.updateUI(null);
      return;
    }

    try {
      const user = await ApiClient.get("/auth/me");
      ApiClient.setUser(user);
      AuthManager.updateUI(user);
    } catch (e) {
      console.warn("Session token expired or invalid:", e);
      ApiClient.setToken(null);
      ApiClient.setUser(null);
      AuthManager.updateUI(null);
    }
  }

  static async handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const emailInput = form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector('input[type="password"]');

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    try {
      const res = await ApiClient.post("/auth/login", { email, password });
      if (res.success && res.access_token) {
        ApiClient.setToken(res.access_token);
        ApiClient.setUser(res.user);
        AuthManager.updateUI(res.user);
        if (typeof toggleAuthModal === "function") toggleAuthModal(false);
        alert(`Welcome back, ${res.user.name || "Ansari Yasin"}!`);
        if (window.HistoryManager) window.HistoryManager.loadHistory();
      }
    } catch (err) {
      alert(`Login failed: ${err.message}`);
    }
  }

  static async handleSignup(e) {
    e.preventDefault();
    const form = e.target;
    const nameInput = form.querySelector('input[type="text"]');
    const emailInput = form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector('input[type="password"]');

    const name = nameInput ? nameInput.value.trim() : "Ansari Yasin";
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!email || !password) {
      alert("Please provide email and password.");
      return;
    }

    try {
      const res = await ApiClient.post("/auth/register", { name, email, password });
      if (res.success && res.access_token) {
        ApiClient.setToken(res.access_token);
        ApiClient.setUser(res.user);
        AuthManager.updateUI(res.user);
        if (typeof toggleAuthModal === "function") toggleAuthModal(false);
        alert("Account created successfully!");
        if (window.HistoryManager) window.HistoryManager.loadHistory();
      }
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
    }
  }

  static async handleForgot(e) {
    e.preventDefault();
    const form = e.target;
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput ? emailInput.value.trim() : "";

    if (!email) {
      alert("Please enter your email address.");
      return;
    }

    try {
      await ApiClient.post("/auth/forgot-password", { email });
      alert("Password reset link has been sent to your email address.");
      if (typeof switchAuthView === "function") switchAuthView("login");
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  static async logout() {
    try {
      await ApiClient.post("/auth/logout");
    } catch (e) {
      console.warn("Logout request notice:", e);
    }
    ApiClient.setToken(null);
    ApiClient.setUser(null);
    AuthManager.updateUI(null);
    alert("You have been logged out.");
  }

  static async handleProfileSave(e) {
    e.preventDefault();
    const nameInput = document.querySelector("#profName");
    const newName = nameInput ? nameInput.value.trim() : "";

    if (!newName) {
      alert("Name cannot be empty.");
      return;
    }

    try {
      const updated = await ApiClient.patch("/users/me", { name: newName });
      ApiClient.setUser(updated);
      AuthManager.updateUI(updated);
      alert("Profile updated successfully!");
    } catch (err) {
      alert(`Could not update profile: ${err.message}`);
    }
  }

  static updateUI(user) {
    const isAuth = !!user;
    const displayName = user ? (user.name || "Ansari Yasin") : "Ansari Yasin";
    const email = user ? user.email : "ansari.yasin@student";
    const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase() || "AY";

    // Update profile text in top bar
    document.querySelectorAll(".profile-name-display").forEach(el => {
      el.textContent = displayName;
    });

    document.querySelectorAll(".profile-email-display").forEach(el => {
      el.textContent = email;
    });

    document.querySelectorAll(".profile-avatar-display").forEach(el => {
      el.textContent = initials;
    });

    // Update Profile View Inputs
    const profNameInput = document.querySelector("#profName");
    if (profNameInput) profNameInput.value = displayName;

    const profEmailInput = document.querySelector('#viewProfile input[type="email"]');
    if (profEmailInput) profEmailInput.value = email;
  }
}

window.AuthManager = AuthManager;
