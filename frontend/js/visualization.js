class VisualizationExplorer {
  static async plotCustom2D(expr = null) {
    const input = document.querySelector("#mainFormulaInput") || document.querySelector("#custom2DInput");
    const expression = expr || (input ? input.value.trim() : "a * sin(b * x)");

    if (!expression) {
      alert("Please enter a 2D mathematical expression.");
      return;
    }

    if (input) input.value = expression;

    if (window.switchVisDimension) {
      window.switchVisDimension("2d");
    } else if (window.render2DChart) {
      window.render2DChart();
    }
  }

  static async plotCustom3D(expr = null) {
    const input = document.querySelector("#mainFormulaInput") || document.querySelector("#custom3DInput");
    const expression = expr || (input ? input.value.trim() : "a * sin(x) * cos(b * y)");

    if (!expression) {
      alert("Please enter a 3D surface expression.");
      return;
    }

    if (input) input.value = expression;

    if (window.switchVisDimension) {
      window.switchVisDimension("3d");
    } else if (window.render3DPlotly) {
      window.render3DPlotly();
    }
  }

  static render2DPlotly(data) {
    const container = document.querySelector("#plotly3DContainer");
    if (!container || !window.Plotly) return;

    const trace = {
      x: data.x,
      y: data.y,
      type: "scatter",
      mode: "lines",
      line: { color: "#2563eb", width: 3 },
      name: data.formula_latex || "y(x)"
    };

    const layout = {
      title: { text: data.formula_latex ? `Curve: ${data.formula_latex}` : "2D Function Curve", font: { size: 14 } },
      margin: { t: 40, b: 40, l: 50, r: 40 },
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      xaxis: { title: "x" },
      yaxis: { title: "y" }
    };

    Plotly.react(container, [trace], layout, { responsive: true, displayModeBar: false });
  }

  static render3DPlotly(data) {
    const container = document.querySelector("#plotly3DContainer");
    if (!container || !window.Plotly) return;

    const trace = {
      x: data.x,
      y: data.y,
      z: data.z,
      type: "surface",
      colorscale: "Plasma",
      showscale: true,
      colorbar: { thickness: 14, len: 0.85 }
    };

    const layout = {
      title: { text: data.formula_latex ? `Surface: ${data.formula_latex}` : "3D Surface Manifold", font: { size: 14 } },
      margin: { t: 30, b: 30, l: 30, r: 30 },
      scene: { camera: { eye: { x: 1.45, y: -1.75, z: 0.95 } } }
    };

    Plotly.react(container, [trace], layout, { responsive: true, displayModeBar: false });
  }

  static async fetchRandomFormula() {
    const presets = [
      { formula: "sin(sqrt(x^2 + y^2))", type: "3d" },
      { formula: "x^2 - y^2", type: "3d" },
      { formula: "cos(x) * sin(y)", type: "3d" },
      { formula: "a * sin(b * x)", type: "2d" },
      { formula: "x^3 - 3*x", type: "2d" }
    ];
    try {
      const data = await ApiClient.get("/random-formula");
      if (data && data.formula) {
        const input = document.querySelector("#mainFormulaInput");
        if (input) input.value = data.formula;
        if (window.switchVisDimension) {
          window.switchVisDimension(data.type || "3d");
        }
        return;
      }
    } catch (e) {
      console.warn("Using offline visualization formula preset.");
    }
    const item = presets[Math.floor(Math.random() * presets.length)];
    const input = document.querySelector("#mainFormulaInput");
    if (input) input.value = item.formula;
    if (window.switchVisDimension) window.switchVisDimension(item.type);
  }
}

// Global functions for inline HTML event bindings
window.plot2DUserFormula = () => VisualizationExplorer.plotCustom2D();
window.render3DPlotly = () => {
  if (window.executeFormulaRender) {
    window.executeFormulaRender();
  } else {
    VisualizationExplorer.plotCustom3D();
  }
};
window.randomize2D = () => VisualizationExplorer.fetchRandomFormula();
window.set2DPreset = (formulaStr) => VisualizationExplorer.plotCustom2D(formulaStr);

window.VisualizationExplorer = VisualizationExplorer;
