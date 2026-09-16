/* Solution History & Favorites Manager */

document.addEventListener("DOMContentLoaded", () => {
  HistoryManager.init();
});

class HistoryManager {
  static init() {
    HistoryManager.loadHistory();
  }

  static async loadHistory() {
    const token = ApiClient.getToken();
    const historyListContainer = document.querySelector("#historyListContainer");

    if (!token) {
      if (historyListContainer) {
        historyListContainer.innerHTML = `
          <div class="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-sm">
            <p class="font-semibold text-slate-700">Sign in to view solution history</p>
            <p class="text-xs mt-1">Your solved problems will be automatically saved to your private account.</p>
          </div>
        `;
      }
      return;
    }

    try {
      const items = await ApiClient.get("/history");
      HistoryManager.renderHistoryItems(items);
    } catch (err) {
      console.warn("Could not load history:", err);
    }
  }

  static renderHistoryItems(items) {
    const historyListContainer = document.querySelector("#historyListContainer");
    if (!historyListContainer) return;

    if (!items || items.length === 0) {
      historyListContainer.innerHTML = `
        <div class="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-sm">
          No solved problems yet. Solve a math problem to save it in your history!
        </div>
      `;
      return;
    }

    historyListContainer.innerHTML = items.map(item => `
      <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors space-y-2 relative group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700">
            ${item.topic || "Mathematics"}
          </span>
          <div class="flex items-center gap-2">
            <button onclick="HistoryManager.toggleFav('${item.id}', event)" class="text-sm hover:scale-110 transition-transform">
              ${item.is_favorite ? "⭐" : "☆"}
            </button>
            <button onclick="HistoryManager.deleteItem('${item.id}', event)" class="text-xs text-slate-400 hover:text-red-600 transition-colors">
              🗑
            </button>
          </div>
        </div>

        <h4 class="font-bold text-sm text-slate-800">${item.problem}</h4>
        ${item.final_answer ? `<p class="text-xs text-emerald-700 font-mono">Answer: ${item.final_answer}</p>` : ""}
        <p class="text-[10px] text-slate-400">${item.created_at ? new Date(item.created_at).toLocaleString() : "Recently Solved"}</p>

        <button onclick="HistoryManager.reopenSolution('${item.id}')" class="mt-2 text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
          Open Solution →
        </button>
      </div>
    `).join("");
  }

  static async reopenSolution(id) {
    try {
      const item = await ApiClient.get(`/history/${id}`);
      if (item && item.solution_json) {
        if (typeof switchTab === "function") switchTab("solver");
        const textarea = document.querySelector("#solverInputArea");
        if (textarea) textarea.value = item.problem;
        if (window.SolverEngine) {
          window.SolverEngine.renderSolution(item.solution_json);
        }
      }
    } catch (e) {
      alert(`Could not open solution: ${e.message}`);
    }
  }

  static async toggleFav(id, event) {
    if (event) event.stopPropagation();
    try {
      await ApiClient.patch(`/history/${id}/favorite`);
      HistoryManager.loadHistory();
    } catch (e) {
      alert(`Bookmark update error: ${e.message}`);
    }
  }

  static async deleteItem(id, event) {
    if (event) event.stopPropagation();
    if (!confirm("Are you sure you want to delete this solution from your history?")) return;

    try {
      await ApiClient.delete(`/history/${id}`);
      HistoryManager.loadHistory();
    } catch (e) {
      alert(`Delete error: ${e.message}`);
    }
  }
}

window.HistoryManager = HistoryManager;
