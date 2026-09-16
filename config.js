// ============================================================
// DEPLOYMENT CONFIG - Dynamic Backend URL Resolver
// ============================================================
const isLocalhost = window.location.hostname === "localhost" || 
                    window.location.hostname === "127.0.0.1" || 
                    window.location.protocol === "file:";

window.LOCATION_BACKEND_URL = isLocalhost 
  ? "http://localhost:8000/api" 
  : (window.location.origin ? `${window.location.origin}/api` : "/api");


