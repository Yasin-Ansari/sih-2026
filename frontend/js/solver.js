/* Math Solver UI Engine */

class SolverEngine {
  static async solveProblem(problemText = null) {
    const textarea = document.querySelector("#solverInputArea") || document.querySelector("#mainFormulaInput");
    const problem = problemText || (textarea ? textarea.value.trim() : "");

    if (!problem) {
      alert("Please enter a mathematics problem.");
      return;
    }

    if (textarea) textarea.value = problem;

    const solveBtn = document.querySelector('button[onclick="triggerSolveEquation()"]') ||
                     document.querySelector('button[onclick="executeFormulaRender()"]');
    const originalBtnText = solveBtn ? solveBtn.innerHTML : "✨ Solve Problem";

    // Show Loading State
    if (solveBtn) {
      solveBtn.disabled = true;
      solveBtn.innerHTML = `🤖 AI is solving your problem...`;
    }

    const loadingOverlay = document.querySelector("#solverLoadingIndicator");
    if (loadingOverlay) loadingOverlay.classList.remove("hidden");

    // Display loading text indicator above results
    const statusTextEl = document.querySelector("#solverStatusIndicator");
    if (statusTextEl) {
      statusTextEl.textContent = "🤖 AI is solving your problem...";
      statusTextEl.classList.remove("hidden");
    }

    const problemDisplayEl = document.querySelector("#solverInputProblemDisplay");
    if (problemDisplayEl) {
      problemDisplayEl.textContent = problem;
      problemDisplayEl.classList.remove("hidden");
    }

    try {
      const data = await ApiClient.post("/solve", { problem });
      if (!data.success) {
        alert(data.message || "Could not process the mathematical solution.");
        return;
      }

      // Hide loading status text when done
      if (statusTextEl) {
        statusTextEl.classList.add("hidden");
      }

      // Render Solution in UI
      SolverEngine.renderSolution(data, problem);

      // Reload history list if user is logged in
      if (window.HistoryManager) {
        window.HistoryManager.loadHistory();
      }

    } catch (err) {
      console.error("Solve error:", err);
      alert(`Unable to connect to the server: ${err.message}`);
    } finally {
      if (solveBtn) {
        solveBtn.disabled = false;
        solveBtn.innerHTML = originalBtnText;
      }
      if (loadingOverlay) loadingOverlay.classList.add("hidden");
    }
  }

  static cleanMathText(str) {
    if (!str) return "";
    let clean = String(str).replace(/^>\s*/, "").replace(/^>xxx\s*/, "").trim();
    clean = clean.replace(/\\2\s*\+/g, " + ").replace(/\\left\[/g, "[").replace(/\\right\]/g, "]");
    return clean;
  }

  static renderSolution(data, originalProblem = "") {
    const { problem_analysis, solution_strategy, steps, final_answer, verification, visualization } = data;

    // Container for solution output
    const outputContainer = document.querySelector("#solverOutputArea");
    if (!outputContainer) return;

    outputContainer.classList.remove("hidden");

    // 1. Banner Card (Matching Screenshot Image 4)
    const bannerHtml = `
      <div class="bg-[#f0f6ff] border border-[#dbe6ff] rounded-2xl p-6 text-center shadow-2xs space-y-1 mb-6">
        <h2 class="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
          <span class="text-2xl">🧮</span> AI Mathematics Visual Solver
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 font-medium">
          Understand mathematics through clear, human-like step-by-step reasoning
        </p>
      </div>
    `;

    // 2. Understanding the Problem Card (Matching Screenshot Image 4)
    let problemAnalysisHtml = "";
    if (problem_analysis) {
      const topic = problem_analysis.topic || "Calculus - Differentiation";
      const findText = problem_analysis.find || "The derivative of y with respect to x (dy/dx)";
      
      const givenList = Array.isArray(problem_analysis.given_information) && problem_analysis.given_information.length > 0
        ? problem_analysis.given_information
        : ["Function: " + (originalProblem || "y = 3x^4 - 5x^3 + 2x^2 - 7x + 4")];
      
      const givenItems = givenList.map(item => `<li><span class="font-medium text-slate-800">${SolverEngine.cleanMathText(item)}</span></li>`).join("");

      const varList = Array.isArray(problem_analysis.variables) && problem_analysis.variables.length > 0
        ? problem_analysis.variables
        : ["x", "y"];
      const varItems = varList.map(v => `<li><span class="font-mono text-slate-800">${v}</span></li>`).join("");

      problemAnalysisHtml = `
        <div class="space-y-3 mb-8">
          <h3 class="text-xl font-medium text-slate-600 flex items-center gap-2">
            <span>🔍</span> Understanding the Problem
          </h3>
          <div class="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xs">
            <div>
              <span class="font-bold text-slate-900">Topic: </span>
              <span class="text-slate-800 font-medium">${topic}</span>
            </div>
            <div>
              <span class="font-bold text-slate-900">Find: </span>
              <span class="text-slate-800 font-medium">${findText}</span>
            </div>
            <div>
              <span class="font-bold text-slate-900 block mb-1">Given Information</span>
              <ul class="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                ${givenItems}
              </ul>
            </div>
            <div>
              <span class="font-bold text-slate-900 block mb-1">Variables</span>
              <ul class="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                ${varItems}
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    // 3. Step-by-Step Pathway Cards (Matching Screenshots Images 2, 3, 5)
    let stepCardsHtml = "";
    if (steps && steps.length > 0) {
      const cards = steps.map((step, idx) => {
        const isFinalStep = idx === steps.length - 1 || (step.change_type || "").toLowerCase().includes("final");
        const borderClass = isFinalStep ? "border-l-[6px] border-[#d97706]" : "border-l-[6px] border-[#2563eb]";
        const badgeClass = isFinalStep ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#e0e7ff] text-[#3730a3]";
        
        let badgeLabel = isFinalStep ? "Final Answer" : (step.change_type || "Formula Application");
        if (badgeLabel === "formula_application") badgeLabel = "Formula Application";
        if (badgeLabel === "original") badgeLabel = "Original Expression";

        const titleText = step.title ? `Step ${step.step_number || idx + 1}: ${step.title}` : `Step ${step.step_number || idx + 1}`;
        const mainExpr = step.current_expression || step.latex || "";

        // What changed box
        let whatChangedHtml = "";
        if (step.changes && step.changes.length > 0) {
          const changeItemsHtml = step.changes.map(c => {
            const oldLatex = c.old ? `$${c.old.replace(/^\$/, '').replace(/\$$/, '')}$` : "";
            const newLatex = c.new ? `<span class="font-bold text-[#2563eb]">$${c.new.replace(/^\$/, '').replace(/\$$/, '')}$</span>` : "";
            const ruleText = c.reason || c.rule || "";
            return `
              <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2 font-mono text-xs sm:text-sm">
                  ${oldLatex ? `<span class="text-slate-500">${oldLatex}</span> <span class="text-slate-400">→</span>` : ""}
                  ${newLatex}
                </div>
                ${ruleText ? `<p class="text-xs text-slate-500 font-sans mt-0.5">${SolverEngine.cleanMathText(ruleText)}</p>` : ""}
              </div>
            `;
          }).join("");

          whatChangedHtml = `
            <div class="bg-[#f0f7ff] border border-blue-100 rounded-2xl p-4 sm:p-5 space-y-2">
              <h4 class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>🔀</span> What changed?
              </h4>
              ${changeItemsHtml}
            </div>
          `;
        } else if (step.previous_expression && step.latex) {
          const oldLatex = `$${step.previous_expression.replace(/^\$/, '').replace(/\$$/, '')}$`;
          const newLatex = `<span class="font-bold text-[#2563eb]">$${step.latex.replace(/^\$/, '').replace(/\$$/, '')}$</span>`;
          const ruleText = step.reason || "";
          whatChangedHtml = `
            <div class="bg-[#f0f7ff] border border-blue-100 rounded-2xl p-4 sm:p-5 space-y-2">
              <h4 class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>🔀</span> What changed?
              </h4>
              <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2 font-mono text-xs sm:text-sm">
                  <span class="text-slate-500">${oldLatex}</span> <span class="text-slate-400">→</span> ${newLatex}
                </div>
                ${ruleText ? `<p class="text-xs text-slate-500 font-sans mt-0.5">${SolverEngine.cleanMathText(ruleText)}</p>` : ""}
              </div>
            </div>
          `;
        }

        // Explanation Box
        let explanationHtml = "";
        if (step.explanation) {
          explanationHtml = `
            <div class="bg-slate-50/90 border-l-4 border-slate-400 rounded-xl p-4 space-y-1">
              <h4 class="font-bold text-slate-800 text-xs sm:text-sm">Explanation:</h4>
              <p class="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">${SolverEngine.cleanMathText(step.explanation)}</p>
            </div>
          `;
        }

        // Why this step? Box
        let whyThisStepHtml = "";
        if (step.reason) {
          whyThisStepHtml = `
            <div class="bg-[#fffde7] border-l-4 border-[#f59e0b] rounded-xl p-4 space-y-1 shadow-2xs">
              <h4 class="font-bold text-[#854d0e] text-xs sm:text-sm">Why this step?</h4>
              <p class="text-xs sm:text-sm text-[#a16207] font-medium leading-relaxed">${SolverEngine.cleanMathText(step.reason)}</p>
            </div>
          `;
        }

        // LaTeX display equation under card
        let latexEquationHtml = "";
        if (step.latex) {
          latexEquationHtml = `
            <div class="pt-2 text-left text-lg sm:text-xl text-slate-900 font-medium overflow-x-auto">
              $$\\displaystyle ${step.latex.replace(/^\$/, '').replace(/\$$/, '')}$$
            </div>
          `;
        }

        return `
          <div class="step-card w-full p-6 sm:p-8 ${borderClass} rounded-2xl bg-white space-y-4 shadow-2xs hover:shadow-md transition-all">
            <div class="space-y-2">
              <h3 class="font-bold text-slate-900 text-lg sm:text-xl">${titleText}</h3>
              <div>
                <span class="px-3.5 py-1 rounded-full text-xs font-semibold ${badgeClass} inline-block shadow-2xs">
                  ${badgeLabel}
                </span>
              </div>
            </div>

            ${mainExpr ? `
              <div class="w-full p-4 sm:p-5 bg-[#f8fafc] border border-slate-200/90 rounded-xl font-mono text-slate-900 text-base sm:text-lg font-medium shadow-2xs overflow-x-auto">
                ${mainExpr}
              </div>
            ` : ""}

            ${whatChangedHtml}
            ${explanationHtml}
            ${whyThisStepHtml}
            ${latexEquationHtml}
          </div>
        `;
      }).join("");

      stepCardsHtml = `
        <div class="w-full space-y-6 mb-8">
          ${cards}
        </div>
      `;
    }

    // 4. Final Answer Section (Matching Screenshots Images 1 & 5)
    let finalAnswerSectionHtml = "";
    if (final_answer) {
      const ansString = final_answer.answer || final_answer.latex || "";
      const ansLatex = final_answer.latex || final_answer.answer || "";
      const ansUnit = final_answer.unit || "";

      finalAnswerSectionHtml = `
        <div class="space-y-6 pt-4">
          <!-- Top Yellow Outline Final Answer Box -->
          <div class="bg-[#fffdf0] border-2 border-[#f59e0b] rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xs">
            <h3 class="font-bold text-[#92400e] text-lg sm:text-xl flex items-center gap-2">
              <span>🏆</span> Final Answer
            </h3>
            <div class="text-2xl sm:text-3xl font-extrabold text-[#92400e] font-mono">
              ${ansString}
            </div>
            <div>
              <span class="bg-[#fef3c7] text-[#92400e] border border-[#fde68a] px-3.5 py-1 rounded-lg text-xs font-bold inline-block">
                Unit: ${ansUnit}
              </span>
            </div>
          </div>

          <!-- Final Mathematical Form -->
          <div class="space-y-2 pt-2">
            <h3 class="font-normal text-slate-500 text-xl sm:text-2xl">
              Final Mathematical Form
            </h3>
            <hr class="border-slate-200" />
            <div class="text-lg sm:text-xl text-slate-900 py-3 overflow-x-auto">
              $$\\displaystyle ${ansLatex.replace(/^\$/, '').replace(/\$$/, '')}$$
            </div>
          </div>
        </div>
      `;
    }

    // Combine all sections into the output container
    outputContainer.innerHTML = `
      ${bannerHtml}
      ${problemAnalysisHtml}
      ${stepCardsHtml}
      ${finalAnswerSectionHtml}
    `;

    // 5. Trigger KaTeX Typesetting across solution view
    const viewSolver = document.querySelector("#view-solver") || document.body;
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(viewSolver, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false
        });
      } catch (e) {
        console.warn("KaTeX render notice:", e);
      }
    } else if (window.renderAllMath) {
      window.renderAllMath(viewSolver);
    }

    // 6. Plotly Graph Visualization if available
    if (visualization) {
      SolverEngine.renderPlotlyGraph(visualization);
    }
  }

  static renderPlotlyGraph(vis) {
    const container = document.querySelector("#plotly3DContainer");
    if (!container || !window.Plotly) return;

    if (vis.three_d && vis.three_d.available && vis.three_d.z.length > 0) {
      const trace = {
        x: vis.three_d.x,
        y: vis.three_d.y,
        z: vis.three_d.z,
        type: "surface",
        colorscale: "Plasma",
        showscale: true,
        colorbar: { thickness: 14, len: 0.8 }
      };
      const layout = {
        title: { text: vis.formula_latex ? `3D Surface: ${vis.formula_latex}` : "3D Surface Mesh", font: { size: 14, color: "#1e293b" } },
        margin: { t: 35, b: 25, l: 25, r: 25 },
        scene: { camera: { eye: { x: 1.45, y: -1.75, z: 0.95 } } }
      };
      Plotly.react(container, [trace], layout, { responsive: true });
    } else if (vis.two_d && vis.two_d.available && vis.two_d.x.length > 0) {
      const trace = {
        x: vis.two_d.x,
        y: vis.two_d.y,
        type: "scatter",
        mode: "lines",
        line: { color: "#4f46e5", width: 3 },
        name: vis.formula_latex || "Function Curve"
      };
      const layout = {
        title: { text: vis.formula_latex ? `Curve: ${vis.formula_latex}` : "2D Function Plot", font: { size: 14, color: "#1e293b" } },
        margin: { t: 35, b: 35, l: 45, r: 35 },
        paper_bgcolor: "#ffffff",
        plot_bgcolor: "#f8fafc"
      };
      Plotly.react(container, [trace], layout, { responsive: true });
    }
  }

  static async fetchRandomFormula() {
    try {
      const data = await ApiClient.get("/random-formula");
      if (data && data.formula) {
        const textarea = document.querySelector("#solverInputArea") || document.querySelector("#mainFormulaInput");
        if (textarea) textarea.value = data.formula;
        alert(`Loaded random formula (${data.category}): ${data.formula}`);
      }
    } catch (e) {
      console.error("Random formula error:", e);
    }
  }
}

// Global functions for inline onclick attributes
window.triggerSolveEquation = () => SolverEngine.solveProblem();
window.setRandomSolverEquation = () => SolverEngine.fetchRandomFormula();
window.setSolverInput = (str) => {
  const textarea = document.querySelector("#solverInputArea") || document.querySelector("#mainFormulaInput");
  if (textarea) {
    textarea.value = str;
    textarea.focus();
  }
};

window.SolverEngine = SolverEngine;
