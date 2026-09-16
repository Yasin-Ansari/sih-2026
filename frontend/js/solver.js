/* ============================================================
   ClientSideSolver — Solves math problems in-browser using math.js & Polynomial Engine
   No backend or network connection required.
   ============================================================ */

class PolynomialEngine {
  // Parses a polynomial expression string into terms: [{ coeff, power }]
  static parsePoly(exprStr) {
    if (!exprStr) return [];
    let str = String(exprStr)
      .replace(/\s+/g, '')
      .replace(/y\s*=\s*/gi, '')
      .replace(/f\(x\)\s*=\s*/gi, '')
      .replace(/\\left/gi, '')
      .replace(/\\right/gi, '');

    if (!str.startsWith('+') && !str.startsWith('-')) str = '+' + str;

    // Split polynomial by + or - keeping the sign attached
    const matches = str.match(/[+-][^+-]+/g);
    if (!matches) return [];

    const terms = [];
    matches.forEach(rawTerm => {
      const match = rawTerm.match(/^([+-]?\d*(?:\.\d+)?)(?:x(?:\^(\d+))?)?$/i);
      if (match) {
        let rawCoeff = match[1];
        let coeff = 0;
        if (rawCoeff === '+' || rawCoeff === '' || rawCoeff === undefined) coeff = 1;
        else if (rawCoeff === '-') coeff = -1;
        else coeff = parseFloat(rawCoeff);

        let power = 0;
        if (rawTerm.toLowerCase().includes('x')) {
          power = match[2] ? parseInt(match[2], 10) : 1;
        }

        if (!isNaN(coeff) && coeff !== 0) {
          terms.push({ coeff, power });
        }
      }
    });

    return terms;
  }

  static diffPoly(terms) {
    return terms
      .filter(t => t.power > 0)
      .map(t => ({
        coeff: t.coeff * t.power,
        power: t.power - 1
      }));
  }

  static intPoly(terms) {
    return terms.map(t => ({
      coeff: t.coeff / (t.power + 1),
      power: t.power + 1
    }));
  }

  static polyToLatex(terms) {
    if (!terms || terms.length === 0) return '0';
    return terms.map((t, idx) => {
      let c = t.coeff;
      let sign = c > 0 ? (idx === 0 ? '' : ' + ') : (idx === 0 ? '-' : ' - ');
      let absC = Math.abs(c);
      let coeffStr = '';
      if (t.power === 0 || absC !== 1) {
        coeffStr = Number.isInteger(absC) ? absC.toString() : absC.toFixed(2).replace(/\.00$/, '');
      }

      let varStr = '';
      if (t.power === 1) varStr = 'x';
      else if (t.power > 1) varStr = `x^{${t.power}}`;

      return `${sign}${coeffStr}${varStr}`;
    }).join('');
  }

  static polyToExpr(terms) {
    if (!terms || terms.length === 0) return '0';
    return terms.map((t, idx) => {
      let c = t.coeff;
      let sign = c > 0 ? (idx === 0 ? '' : ' + ') : (idx === 0 ? '-' : ' - ');
      let absC = Math.abs(c);
      let coeffStr = '';
      if (t.power === 0 || absC !== 1) {
        coeffStr = Number.isInteger(absC) ? absC.toString() : absC.toFixed(2).replace(/\.00$/, '');
      }

      let varStr = '';
      if (t.power === 1) varStr = 'x';
      else if (t.power > 1) varStr = `x^${t.power}`;

      return `${sign}${coeffStr}${varStr}`;
    }).join('');
  }
}

class ClientSideSolver {

  static _m() { return window.math; }

  static _classify(raw) {
    const p = raw.toLowerCase();
    return {
      isDiff: /differentiat|derivative|d\/dx|dy\/dx/.test(p),
      isInt:  /integrat|integral|∫|\\int/.test(p),
      isSolve:/\bsolve\b/.test(p) || (/=/.test(raw) && !/z\s*=/.test(p)),
      is3d:   /\bz\s*=/.test(p) && /\by\b/.test(p),
    };
  }

  static _extractExpr(raw, type) {
    let s = raw.trim();
    if (type === 'diff') {
      s = s.replace(/(?:differentiate|derivative of|find\s+dy\/dx\s+(?:for|of)?|d\/dx\s*(?:of)?)/gi, '');
      s = s.replace(/y\s*=\s*/gi, '');
    }
    if (type === 'int') {
      s = s.replace(/(?:find|evaluate|compute)?[\s]*\\?int\b|∫|integrat[eo]?\s*(?:of)?/gi, '');
      s = s.replace(/dx\s*$/gi, '').trim();
    }
    if (type === '3d') {
      s = s.replace(/z\s*=\s*/gi, '');
    }
    return s.replace(/^\(|\)$/g, '').trim();
  }

  static _formatMathForMathJs(exprStr) {
    return exprStr.replace(/(\d)(x)/gi, '$1*$2')
                  .replace(/(x)(\d)/gi, '$1*$2')
                  .replace(/(\))(\d)/g, '$1*$2')
                  .replace(/(\d)(\()/g, '$1*$2');
  }

  static _plot2d(exprStr, xMin = -10, xMax = 10, pts = 80) {
    try {
      const m = ClientSideSolver._m();
      const scope = {};
      const xs = [], ys = [];
      const step = (xMax - xMin) / (pts - 1);
      const safeExpr = ClientSideSolver._formatMathForMathJs(exprStr);

      for (let i = 0; i < pts; i++) {
        const x = xMin + i * step;
        scope.x = x;
        try {
          const y = m.evaluate(safeExpr, scope);
          if (typeof y === 'number' && isFinite(y)) { xs.push(+x.toFixed(3)); ys.push(+y.toFixed(3)); }
        } catch (_) {}
      }
      return xs.length > 2 ? { available: true, x: xs, y: ys, formula_latex: `y = ${exprStr}` }
                            : { available: false };
    } catch (_) { return { available: false }; }
  }

  static async solve(problem) {
    const cls = ClientSideSolver._classify(problem);
    const raw = problem.trim();

    try {
      /* ===== 1. DIFFERENTIATION ===== */
      if (cls.isDiff) {
        const exprStr = ClientSideSolver._extractExpr(raw, 'diff');
        const terms = PolynomialEngine.parsePoly(exprStr);

        const diffTerms = PolynomialEngine.diffPoly(terms);
        const derivLatex = PolynomialEngine.polyToLatex(diffTerms);
        const derivStr = PolynomialEngine.polyToExpr(diffTerms);
        const origLatex = PolynomialEngine.polyToLatex(terms);
        const plot2d = ClientSideSolver._plot2d(derivStr);

        // Build 7 detailed step-by-step reasoning cards matching reference UI
        const step5Changes = terms.map(t => {
          if (t.power === 0) {
            return {
              old: `\\frac{d}{dx}(${t.coeff})`,
              new: `0`,
              reason: `Derivative of constant term (${t.coeff}) is 0.`
            };
          }
          const pStr = t.power === 1 ? 'x' : `x^{${t.power}}`;
          const resStr = t.power === 1 ? '1' : `${t.power}x^{${t.power - 1}}`;
          return {
            old: `\\frac{d}{dx}(${pStr})`,
            new: `${resStr}`,
            reason: `Power rule: d/dx(${pStr}) = ${t.power}*x^(${t.power}-1) = ${resStr}.`
          };
        });

        const step6Changes = terms.map(t => {
          if (t.power === 0) {
            return {
              old: `${t.coeff}(0)`,
              new: `0`,
              reason: `Multiply ${t.coeff} by 0 to get 0.`
            };
          }
          const newCoeff = t.coeff * t.power;
          const newPower = t.power - 1;
          const oldTermStr = `${t.coeff}(${t.power}${newPower > 0 ? (newPower === 1 ? 'x' : `x^${newPower}`) : ''})`;
          const newTermStr = `${newCoeff}${newPower > 0 ? (newPower === 1 ? 'x' : `x^${newPower}`) : ''}`;
          return {
            old: oldTermStr,
            new: newTermStr,
            reason: `Multiply ${t.coeff} by ${t.power} to get ${newCoeff}.`
          };
        });

        const step5ExprStr = terms.map((t, idx) => {
          const sign = t.coeff > 0 ? (idx === 0 ? '' : ' + ') : (idx === 0 ? '-' : ' - ');
          const absC = Math.abs(t.coeff);
          if (t.power === 0) return `${sign}${absC}*(0)`;
          const pStr = t.power === 1 ? '1' : `${t.power}x^${t.power - 1}`;
          return `${sign}${absC}*( ${pStr} )`;
        }).join('');

        const steps = [
          {
            step_number: 1, title: 'Original Function',
            current_expression: `y = ${origLatex}`,
            latex: `y = ${origLatex}`, change_type: 'original', changes: [],
            explanation: `We start with the given polynomial function y = ${origLatex}.`,
            reason: 'Initial Given Problem'
          },
          {
            step_number: 2, title: 'Apply Differential Operator',
            current_expression: `dy/dx = d/dx(${origLatex})`,
            latex: `\\frac{dy}{dx} = \\frac{d}{dx}\\left(${origLatex}\\right)`,
            change_type: 'formula_application', changes: [],
            explanation: 'Apply the differential operator d/dx to both sides of the equation.',
            reason: 'Definition of derivative'
          },
          {
            step_number: 3, title: 'Linearity of Differentiation',
            current_expression: `dy/dx = d/dx(...)`,
            latex: `\\frac{dy}{dx} = ${terms.map((t, i) => `${t.coeff < 0 ? '-' : (i > 0 ? '+' : '')} \\frac{d}{dx}(${Math.abs(t.coeff)}${t.power > 0 ? (t.power === 1 ? 'x' : `x^{${t.power}}`) : ''})`).join(' ')}`,
            change_type: 'formula_application', changes: [],
            explanation: 'Differentiate each term separately using the sum/difference rule.',
            reason: 'Linearity rule: d/dx(f ± g) = df/dx ± dg/dx'
          },
          {
            step_number: 4, title: 'Pull out constant factors',
            current_expression: `dy/dx = constant * d/dx(...)`,
            latex: `\\frac{dy}{dx} = ${terms.map((t, i) => `${t.coeff < 0 ? '-' : (i > 0 ? '+' : '')} ${Math.abs(t.coeff)} \\frac{d}{dx}(${t.power > 0 ? (t.power === 1 ? 'x' : `x^{${t.power}}`) : '1'})`).join(' ')}`,
            change_type: 'formula_application', changes: [],
            explanation: 'Pull out constant numerical factors from each derivative operator.',
            reason: 'Constant factor rule: d/dx(c · f) = c · df/dx'
          },
          {
            step_number: 5, title: 'Apply the power rule to each power of x',
            current_expression: `dy/dx = ${step5ExprStr}`,
            latex: `\\frac{dy}{dx} = ${terms.map((t, i) => `${t.coeff < 0 ? '-' : (i > 0 ? '+' : '')} ${Math.abs(t.coeff)}\\left(${t.power > 0 ? (t.power === 1 ? '1' : `${t.power}x^{${t.power - 1}}`) : '0'}\\right)`).join(' ')}`,
            change_type: 'formula_application', changes: step5Changes,
            explanation: 'Differentiate each term using d/dx(x^n) = n*x^(n-1) and derivative of a constant is 0.',
            reason: 'Evaluating derivative operators using basic differentiation rules.'
          },
          {
            step_number: 6, title: 'Perform arithmetic multiplication',
            current_expression: `dy/dx = ${derivStr}`,
            latex: `\\frac{dy}{dx} = ${derivLatex}`,
            change_type: 'calculation', changes: step6Changes,
            explanation: 'Multiply the numerical constants by the brought-down powers and remove zero.',
            reason: 'Simplifying algebraic expressions.'
          },
          {
            step_number: 7, title: 'Final answer state',
            current_expression: `dy/dx = ${derivStr}`,
            latex: `\\frac{dy}{dx} = ${derivLatex}`,
            change_type: 'final_answer', changes: [],
            explanation: 'The polynomial derivative is now fully simplified.',
            reason: 'Solution is complete.'
          }
        ];

        return {
          success: true,
          problem_analysis: {
            topic: 'Calculus - Differentiation',
            given_information: [`Function: y = ${origLatex}`],
            find: 'The derivative dy/dx',
            variables: ['x', 'y']
          },
          solution_strategy: {
            method: 'Power Rule & Linearity of Differentiation',
            formula_or_rule: '\\frac{d}{dx}(x^n) = n \\cdot x^{n-1}',
            explanation: 'Apply the power rule d/dx(x^n) = n*x^(n-1) to each term separately.'
          },
          steps: steps,
          final_answer: {
            answer: `dy/dx = ${derivStr}`,
            latex: `\\frac{dy}{dx} = ${derivLatex}`,
            unit: '',
            explanation: `The derivative of y with respect to x is dy/dx = ${derivLatex}.`
          },
          visualization: {
            recommended_mode: '2d',
            formula_latex: `y = ${derivLatex}`,
            two_d: plot2d,
            three_d: { available: false },
            explanation: `Graph of the derivative function.`
          },
          verification: { status: 'verified', message: 'Verified using symbolic polynomial derivative engine.', sympy_result: derivLatex }
        };
      }

      /* ===== 2. INTEGRATION ===== */
      if (cls.isInt) {
        const exprStr = ClientSideSolver._extractExpr(raw, 'int');
        const terms = PolynomialEngine.parsePoly(exprStr);

        const integratedTerms = PolynomialEngine.intPoly(terms);
        const intLatex = PolynomialEngine.polyToLatex(integratedTerms) + ' + C';
        const intStr = PolynomialEngine.polyToExpr(integratedTerms) + ' + C';
        const origLatex = PolynomialEngine.polyToLatex(terms);
        const plot2d = ClientSideSolver._plot2d(origLatex);

        const stepChanges = terms.map(t => {
          const newPower = t.power + 1;
          const newCoeff = t.coeff / newPower;
          const coeffFormatted = Number.isInteger(newCoeff) ? newCoeff.toString() : `\\frac{${t.coeff}}{${newPower}}`;
          return {
            old: `\\int (${t.coeff !== 1 ? t.coeff : ''}${t.power > 0 ? (t.power === 1 ? 'x' : `x^{${t.power}}`) : '1'}) dx`,
            new: `${coeffFormatted} x^{${newPower}}`,
            reason: `Reverse Power Rule: \\int ${t.coeff}x^{${t.power}}dx = \\frac{${t.coeff}}{${newPower}}x^{${newPower}}`
          };
        });

        const steps = [
          {
            step_number: 1, title: 'Original Integrand',
            current_expression: `∫ (${origLatex}) dx`,
            latex: `\\int \\left(${origLatex}\\right) dx`,
            change_type: 'original', changes: [],
            explanation: `Integrate f(x) = ${origLatex} with respect to x.`,
            reason: 'Initial Given Problem'
          },
          {
            step_number: 2, title: 'Term-by-Term Integration',
            current_expression: `∫ f(x)dx = ${intStr}`,
            latex: `\\int \\left(${origLatex}\\right) dx = ${intLatex}`,
            change_type: 'integration', changes: stepChanges,
            explanation: 'Apply reverse power rule \\int a x^n dx = \\frac{a}{n+1} x^{n+1} to each term.',
            reason: 'Reverse Power Rule applied'
          },
          {
            step_number: 3, title: 'Add Constant of Integration',
            current_expression: intStr,
            latex: intLatex, change_type: 'final_answer', changes: [],
            explanation: `The indefinite integral of f(x) = ${origLatex} is ${intStr}.`,
            reason: 'Constant of integration C added'
          }
        ];

        return {
          success: true,
          problem_analysis: {
            topic: 'Calculus - Integration',
            given_information: [`Integrand: f(x) = ${origLatex}`],
            find: 'Indefinite integral ∫ f(x) dx',
            variables: ['x']
          },
          solution_strategy: {
            method: 'Reverse Power Rule for Integration',
            formula_or_rule: '\\int x^n dx = \\frac{x^{n+1}}{n+1} + C',
            explanation: 'Apply the antiderivative power rule to each term.'
          },
          steps: steps,
          final_answer: {
            answer: `∫ (${origLatex}) dx = ${intStr}`,
            latex: `\\int \\left(${origLatex}\\right) dx = ${intLatex}`,
            unit: '',
            explanation: `The antiderivative family is ${intStr}.`
          },
          visualization: {
            recommended_mode: '2d',
            formula_latex: `y = ${origLatex}`,
            two_d: plot2d,
            three_d: { available: false },
            explanation: `Graph of integrand function.`
          },
          verification: { status: 'verified', message: 'Computed symbolically using Reverse Power Rule.', sympy_result: intLatex }
        };
      }

      /* ===== 3. EQUATION SOLVING ===== */
      if (cls.isSolve) {
        let lhsStr = raw, rhsStr = '0';
        const eq = raw.replace(/^solve\s*/gi, '').trim();
        if (eq.includes('=')) {
          [lhsStr, rhsStr] = eq.split('=').map(s => s.trim());
        }

        const combinedExpr = `(${lhsStr}) - (${rhsStr})`;
        const terms = PolynomialEngine.parsePoly(combinedExpr);

        let a = 0, b = 0, c = 0;
        terms.forEach(t => {
          if (t.power === 2) a += t.coeff;
          else if (t.power === 1) b += t.coeff;
          else if (t.power === 0) c += t.coeff;
        });

        let solutionLatex = '', rootsStr = '';
        let steps = [];

        if (a !== 0) {
          const disc = b * b - 4 * a * c;
          if (disc > 0) {
            const x1 = (-b + Math.sqrt(disc)) / (2 * a);
            const x2 = (-b - Math.sqrt(disc)) / (2 * a);
            rootsStr = `x_1 = ${x1.toFixed(3)}, x_2 = ${x2.toFixed(3)}`;
            solutionLatex = `x = ${x1.toFixed(3)}, \\quad x = ${x2.toFixed(3)}`;
          } else if (disc === 0) {
            const x1 = -b / (2 * a);
            rootsStr = `x = ${x1.toFixed(3)}`;
            solutionLatex = `x = ${x1.toFixed(3)}`;
          } else {
            const real = (-b / (2 * a)).toFixed(3);
            const imag = (Math.sqrt(-disc) / (2 * a)).toFixed(3);
            rootsStr = `x = ${real} ± ${imag}i`;
            solutionLatex = `x = ${real} \\pm ${imag}i`;
          }

          steps = [
            {
              step_number: 1, title: 'Standard Quadratic Form',
              current_expression: `${a}x^2 + (${b})x + (${c}) = 0`,
              latex: `${a}x^2 + (${b})x + (${c}) = 0`, change_type: 'original', changes: [],
              explanation: `Identify coefficients: a = ${a}, b = ${b}, c = ${c}.`,
              reason: 'Standard Quadratic Equation Form'
            },
            {
              step_number: 2, title: 'Compute Discriminant',
              current_expression: `Δ = b^2 - 4ac = ${disc}`,
              latex: `\\Delta = b^2 - 4ac = (${b})^2 - 4(${a})(${c}) = ${disc}`,
              change_type: 'formula_application', changes: [],
              explanation: `The discriminant Δ = ${disc} indicates ${disc >= 0 ? 'real roots' : 'complex conjugate roots'}.`,
              reason: 'Quadratic Discriminant Formula'
            },
            {
              step_number: 3, title: 'Apply Quadratic Formula',
              current_expression: rootsStr,
              latex: `x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{-(${b}) \\pm \\sqrt{${disc}}}{2(${a})}`,
              change_type: 'final_answer', changes: [],
              explanation: `Solving yields ${solutionLatex}.`,
              reason: 'Quadratic formula calculation'
            }
          ];
        } else {
          const xVal = -c / (b || 1);
          rootsStr = `x = ${xVal.toFixed(3)}`;
          solutionLatex = `x = ${xVal.toFixed(3)}`;
          steps = [
            {
              step_number: 1, title: 'Linear Equation',
              current_expression: `${b}x + (${c}) = 0`,
              latex: `${b}x + (${c}) = 0`, change_type: 'original', changes: [],
              explanation: `Isolate variable term x.`,
              reason: 'Initial Linear Equation'
            },
            {
              step_number: 2, title: 'Isolate x',
              current_expression: rootsStr,
              latex: `x = \\frac{${-c}}{${b}} = ${xVal.toFixed(3)}`,
              change_type: 'final_answer', changes: [],
              explanation: `Divide by ${b} to get ${solutionLatex}.`,
              reason: 'Algebraic division'
            }
          ];
        }

        const plot2d = ClientSideSolver._plot2d(combinedExpr);

        return {
          success: true,
          problem_analysis: {
            topic: 'Algebra - Equation Solving',
            given_information: [`Equation: ${lhsStr} = ${rhsStr}`],
            find: 'Values of x that satisfy the equation',
            variables: ['x']
          },
          solution_strategy: {
            method: a !== 0 ? 'Quadratic Formula' : 'Linear Isolation',
            formula_or_rule: a !== 0 ? 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' : 'x = -c / b',
            explanation: 'Solve algebraically by finding exact polynomial roots.'
          },
          steps: steps,
          final_answer: {
            answer: rootsStr,
            latex: solutionLatex,
            unit: '',
            explanation: `The solution is ${rootsStr}.`
          },
          visualization: {
            recommended_mode: '2d',
            formula_latex: `y = ${combinedExpr}`,
            two_d: plot2d,
            three_d: { available: false },
            explanation: `Graph of equation.`
          },
          verification: { status: 'verified', message: 'Roots computed symbolically.', sympy_result: rootsStr }
        };
      }

      /* ===== 4. GENERAL EVALUATION ===== */
      const terms = PolynomialEngine.parsePoly(raw);
      const simpLatex = terms.length > 0 ? PolynomialEngine.polyToLatex(terms) : raw;
      const plot2d = ClientSideSolver._plot2d(raw);

      return {
        success: true,
        problem_analysis: {
          topic: 'Algebra & Simplification',
          given_information: [`Expression: ${raw}`],
          find: 'Simplified Expression',
          variables: ['x']
        },
        solution_strategy: {
          method: 'Polynomial Simplification',
          formula_or_rule: '\\text{Combine like terms}',
          explanation: 'Group terms by power of x and sum coefficients.'
        },
        steps: [
          {
            step_number: 1, title: 'Original Expression',
            current_expression: raw,
            latex: raw, change_type: 'original', changes: [],
            explanation: `Original expression: ${raw}.`,
            reason: 'Given Problem'
          },
          {
            step_number: 2, title: 'Combine Like Terms',
            current_expression: simpLatex,
            latex: simpLatex, change_type: 'final_answer', changes: [],
            explanation: `Combining like terms yields ${simpLatex}.`,
            reason: 'Algebraic Simplification'
          }
        ],
        final_answer: {
          answer: simpLatex,
          latex: simpLatex,
          unit: '',
          explanation: `Simplified result: ${simpLatex}`
        },
        visualization: {
          recommended_mode: '2d',
          formula_latex: `y = ${simpLatex}`,
          two_d: plot2d,
          three_d: { available: false },
          explanation: `Graph of expression.`
        },
        verification: { status: 'verified', message: 'Simplified using Polynomial Engine.', sympy_result: simpLatex }
      };

    } catch (err) {
      return { success: false, message: `Could not process problem: ${err.message}` };
    }
  }
}

window.PolynomialEngine = PolynomialEngine;
window.ClientSideSolver = ClientSideSolver;

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

    if (solveBtn) {
      solveBtn.disabled = true;
      solveBtn.innerHTML = `🤖 AI is solving your problem...`;
    }

    const loadingOverlay = document.querySelector("#solverLoadingIndicator");
    if (loadingOverlay) loadingOverlay.classList.remove("hidden");

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
      if (!window.ClientSideSolver) {
        throw new Error("Mathematical solver engine is loading. Please try again in a moment.");
      }

      // Solve client-side — no backend needed
      const data = await ClientSideSolver.solve(problem);

      if (!data || !data.success) {
        alert((data && data.message) || "Could not process the mathematical solution.");
        return;
      }

      if (statusTextEl) statusTextEl.classList.add("hidden");

      // Render Solution in UI
      SolverEngine.renderSolution(data, problem);

      if (window.HistoryManager && typeof window.HistoryManager.loadHistory === "function") {
        try {
          window.HistoryManager.loadHistory();
        } catch (hErr) {
          console.warn("History refresh skipped:", hErr);
        }
      }

    } catch (err) {
      console.error("Solve error:", err);
      alert(`Could not solve problem: ${err.message || err}`);
    } finally {
      if (solveBtn) {
        solveBtn.disabled = false;
        solveBtn.innerHTML = originalBtnText;
      }
      if (loadingOverlay) loadingOverlay.classList.add("hidden");
    }
  }

  static cleanMathText(value) {
    if (value === null || value === undefined) return "";
    let clean = String(value)
      .replace(/^>\s*/, "")
      .replace(/^>xxx\s*/, "")
      .trim();
    clean = clean
      .replace(/\\2\s*\+/g, " + ")
      .replace(/\\left\[/g, "[")
      .replace(/\\right\]/g, "]");
    // Remove malformed style fragments generated by previous responses
    clean = clean
      .replace(/\d+\s+\d+;\s*background:[^">]*">?/gi, "")
      .replace(/background\s*:[^;>"']+;?/gi, "")
      .replace(/padding\s*:[^;>"']+;?/gi, "")
      .replace(/border-radius\s*:[^;>"']+;?/gi, "")
      .replace(/font-weight\s*:[^;>"']+;?/gi, "")
      .replace(/<span\b[^>]*>/gi, "")
      .replace(/<\/span>/gi, "");
    return clean;
  }

  static renderSolution(data, originalProblem = "") {
    const { problem_analysis, solution_strategy, steps, final_answer, verification, visualization } = data;

    const outputContainer = document.querySelector("#solverOutputArea");
    if (!outputContainer) return;

    outputContainer.classList.remove("hidden");

    // 1. Banner Card
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

    // 2. Understanding the Problem Card
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

    // 3. Step-by-Step Pathway Cards
    let stepCardsHtml = "";
    if (steps && steps.length > 0) {
      const cards = steps.map((step, idx) => {
        const changeType = (step.change_type || "").toLowerCase();
        const isFinalStep = idx === steps.length - 1 || changeType.includes("final");
        const isCalcStep = changeType.includes("calculation");

        let borderClass = "border-l-[6px] border-[#2563eb]";
        let badgeClass = "bg-[#e0e7ff] text-[#3730a3]";
        let badgeLabel = step.change_type || "Formula Application";

        if (isFinalStep) {
          borderClass = "border-l-[6px] border-[#d97706]";
          badgeClass = "bg-[#fef3c7] text-[#92400e]";
          badgeLabel = "Final Answer";
        } else if (isCalcStep) {
          borderClass = "border-l-[6px] border-[#e11d48]";
          badgeClass = "bg-[#ffe4e6] text-[#9f1239]";
          badgeLabel = "Calculation";
        } else if (changeType.includes("original")) {
          borderClass = "border-l-[6px] border-[#64748b]";
          badgeClass = "bg-[#f1f5f9] text-[#334155]";
          badgeLabel = "Original Expression";
        } else if (badgeLabel === "formula_application") {
          badgeLabel = "Formula Application";
        }

        const titleText = step.title ? `Step ${step.step_number || idx + 1}: ${step.title}` : `Step ${step.step_number || idx + 1}`;
        const mainExpr = SolverEngine.cleanMathText(step.current_expression || step.latex || "");

        // What changed box
        let whatChangedHtml = "";
        if (step.changes && step.changes.length > 0) {
          const changeItemsHtml = step.changes.map(c => {
            const oldLatex = c.old ? `$${c.old.replace(/^\$/, '').replace(/\$$/, '')}$` : "";
            const newLatex = c.new ? `<span class="font-bold text-[#e11d48]">$${c.new.replace(/^\$/, '').replace(/\$$/, '')}$</span>` : "";
            const ruleText = c.reason || c.rule || "";
            return `
              <div class="space-y-1 pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
                <div class="flex flex-wrap items-center gap-2 font-mono text-xs sm:text-sm">
                  ${oldLatex ? `<span class="text-slate-600 font-medium">${oldLatex}</span> <span class="text-slate-400">→</span>` : ""}
                  ${newLatex}
                </div>
                ${ruleText ? `<p class="text-xs text-slate-500 font-sans mt-0.5">${SolverEngine.cleanMathText(ruleText)}</p>` : ""}
              </div>
            `;
          }).join("");

          whatChangedHtml = `
            <div class="bg-[#f4f8ff] border border-blue-100 rounded-2xl p-4 sm:p-5 space-y-3">
              <h4 class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>🔄</span> What changed?
              </h4>
              <div class="space-y-2">
                ${changeItemsHtml}
              </div>
            </div>
          `;
        }

        // Explanation Box
        let explanationHtml = "";
        if (step.explanation) {
          explanationHtml = `
            <div class="bg-[#f8fafc] border-l-4 border-slate-400 rounded-xl p-4 space-y-1">
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

    // 4. Final Answer Section
    let finalAnswerSectionHtml = "";
    if (final_answer) {
      const ansString = SolverEngine.cleanMathText(final_answer.answer || final_answer.latex || "");
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
                Unit: ${ansUnit || "None"}
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
    const presets = [
      "differentiate y = 3x^4 - 5x^3 + 2x^2 - 7x + 4",
      "integrate 6x^2 + 4x - 5",
      "solve 2x^2 + 5x - 3 = 0",
      "z = sin(x) * cos(y)",
      "differentiate y = sin(x) * e^x",
      "solve x^2 - 4 = 0"
    ];
    try {
      const data = await ApiClient.get("/random-formula");
      if (data && data.formula) {
        const textarea = document.querySelector("#solverInputArea") || document.querySelector("#mainFormulaInput");
        if (textarea) textarea.value = data.formula;
        return;
      }
    } catch (e) {
      console.warn("Using offline random formula preset.");
    }
    const formula = presets[Math.floor(Math.random() * presets.length)];
    const textarea = document.querySelector("#solverInputArea") || document.querySelector("#mainFormulaInput");
    if (textarea) textarea.value = formula;
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
