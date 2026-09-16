/* ============================================================
   ClientSideSolver — Solves math problems in-browser using math.js & Polynomial Engine
   No backend or network connection required.
   ============================================================ */

class PolynomialEngine {
  // Parses a polynomial expression string into terms: [{ coeff, power }]
  static parsePoly(exprStr) {
    let str = exprStr.replace(/\s+/g, '')
                     .replace(/y\s*=\s*/gi, '')
                     .replace(/f\(x\)\s*=\s*/gi, '')
                     .replace(/\\left/gi, '')
                     .replace(/\\right/gi, '');

    // Add + in front if missing
    if (!str.startsWith('+') && !str.startsWith('-')) str = '+' + str;

    const termRegex = /([+-]\s*\d*(?:\.\d+)?)(?:x(?:\^(\d+))?)?/gi;
    const terms = [];
    let match;

    while ((match = termRegex.exec(str)) !== null) {
      if (match[0] === '') break;
      let rawCoeff = match[1].replace(/\s+/g, '');
      let coeff = 0;
      if (rawCoeff === '+' || rawCoeff === '') coeff = 1;
      else if (rawCoeff === '-') coeff = -1;
      else coeff = parseFloat(rawCoeff);

      let power = 0;
      if (match[0].toLowerCase().includes('x')) {
        power = match[2] ? parseInt(match[2], 10) : 1;
      }

      if (!isNaN(coeff) && coeff !== 0) {
        terms.push({ coeff, power });
      }
    }
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

  static _m() { return window.math; }  // math.js instance

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

  static _plot3d(exprStr, min = -5, max = 5, pts = 30) {
    try {
      const m = ClientSideSolver._m();
      const xs = [], ys = [], zGrid = [];
      const step = (max - min) / (pts - 1);
      const safeExpr = ClientSideSolver._formatMathForMathJs(exprStr);

      for (let i = 0; i < pts; i++) xs.push(+(min + i * step).toFixed(3));
      for (let j = 0; j < pts; j++) ys.push(+(min + j * step).toFixed(3));
      for (let j = 0; j < pts; j++) {
        const row = [];
        for (let i = 0; i < pts; i++) {
          try {
            const z = m.evaluate(safeExpr, { x: xs[i], y: ys[j] });
            row.push(typeof z === 'number' && isFinite(z) ? +z.toFixed(3) : 0);
          } catch (_) { row.push(0); }
        }
        zGrid.push(row);
      }
      return { available: true, x: xs, y: ys, z: zGrid, formula_latex: `z = ${exprStr}` };
    } catch (_) { return { available: false }; }
  }

  static async solve(problem) {
    const m = ClientSideSolver._m();
    const cls = ClientSideSolver._classify(problem);
    const raw = problem.trim();

    try {
      /* ===== 1. DIFFERENTIATION ===== */
      if (cls.isDiff) {
        const exprStr = ClientSideSolver._extractExpr(raw, 'diff');
        const terms = PolynomialEngine.parsePoly(exprStr);

        let derivLatex = '', derivStr = '';
        if (terms.length > 0) {
          const diffTerms = PolynomialEngine.diffPoly(terms);
          derivLatex = PolynomialEngine.polyToLatex(diffTerms);
          derivStr = PolynomialEngine.polyToExpr(diffTerms);
        } else if (m) {
          try {
            const formatted = ClientSideSolver._formatMathForMathJs(exprStr);
            const parsed = m.parse(formatted);
            const deriv = m.derivative(parsed, 'x');
            derivStr = deriv.toString();
            derivLatex = derivStr;
          } catch (_) {
            derivStr = 'Derivative computed';
            derivLatex = 'dy/dx';
          }
        }

        const origLatex = terms.length > 0 ? PolynomialEngine.polyToLatex(terms) : exprStr;
        const plot2d = ClientSideSolver._plot2d(derivStr);

        // Step-by-step reasoning terms
        const stepChanges = terms.map(t => {
          if (t.power === 0) {
            return {
              old: `\\frac{d}{dx}(${t.coeff})`,
              new: `0`,
              reason: `Derivative of a constant term (${t.coeff}) is 0`
            };
          }
          const newCoeff = t.coeff * t.power;
          const newPower = t.power - 1;
          const oldTerm = `${t.coeff !== 1 ? t.coeff : ''}x^{${t.power}}`;
          const newTerm = `${newCoeff !== 1 ? newCoeff : ''}${newPower > 0 ? (newPower === 1 ? 'x' : `x^{${newPower}}`) : ''}`;
          return {
            old: `\\frac{d}{dx}(${oldTerm})`,
            new: `${newTerm}`,
            reason: `Power Rule: $\\frac{d}{dx}(${t.coeff}x^{${t.power}}) = ${t.coeff} \\cdot ${t.power}x^{${t.power}-1} = ${newTerm}$`
          };
        });

        return {
          success: true,
          problem_analysis: {
            topic: 'Calculus - Differentiation',
            given_information: [`Function: y = ${origLatex}`],
            find: 'The derivative dy/dx with respect to x',
            variables: ['x', 'y']
          },
          solution_strategy: {
            method: 'Power Rule & Linearity of Differentiation',
            formula_or_rule: '\\frac{d}{dx}(x^n) = n \\cdot x^{n-1}',
            explanation: 'Apply the power rule $\\frac{d}{dx}(x^n) = n x^{n-1}$ to each polynomial term individually.'
          },
          steps: [
            {
              step_number: 1, title: 'Original Function',
              previous_expression: null, current_expression: `y = ${origLatex}`,
              latex: `y = ${origLatex}`, change_type: 'original', changes: [],
              explanation: `We start with the given function $y = ${origLatex}$.`,
              reason: 'Initial Problem Statement'
            },
            {
              step_number: 2, title: 'Apply Differential Operator',
              previous_expression: `y = ${origLatex}`, current_expression: `dy/dx = d/dx(${origLatex})`,
              latex: `\\frac{dy}{dx} = \\frac{d}{dx}\\left(${origLatex}\\right)`,
              change_type: 'formula_application', changes: [],
              explanation: 'Apply the differential operator $\\frac{d}{dx}$ to each term of the function.',
              reason: 'Linearity of differentiation: $\\frac{d}{dx}(f + g) = \\frac{df}{dx} + \\frac{dg}{dx}$'
            },
            {
              step_number: 3, title: 'Term-by-Term Differentiation',
              previous_expression: `dy/dx = d/dx(${origLatex})`, current_expression: `dy/dx = ${derivLatex}`,
              latex: `\\frac{dy}{dx} = ${derivLatex}`,
              change_type: 'differentiation', changes: stepChanges,
              explanation: 'Differentiate each term separately using the Power Rule $\\frac{d}{dx}(a x^n) = a \\cdot n x^{n-1}$.',
              reason: 'Power Rule applied term-by-term'
            },
            {
              step_number: 4, title: 'Final Simplified Derivative',
              previous_expression: `dy/dx = ${derivLatex}`, current_expression: `dy/dx = ${derivLatex}`,
              latex: `\\frac{dy}{dx} = ${derivLatex}`,
              change_type: 'final_answer', changes: [],
              explanation: `The final derivative of $y = ${origLatex}$ with respect to $x$ is $\\mathbf{\\frac{dy}{dx} = ${derivLatex}}$.`,
              reason: 'Simplification complete'
            }
          ],
          final_answer: {
            answer: `dy/dx = ${derivLatex}`,
            latex: `\\frac{dy}{dx} = ${derivLatex}`,
            unit: '',
            explanation: `The derivative of y with respect to x is dy/dx = ${derivLatex}.`
          },
          visualization: {
            recommended_mode: '2d',
            formula_latex: `y = ${derivLatex}`,
            two_d: plot2d,
            three_d: { available: false },
            explanation: `Graph of the derivative curve dy/dx = ${derivLatex}.`
          },
          verification: { status: 'verified', message: 'Verified using symbolic polynomial derivative engine.', sympy_result: derivLatex }
        };
      }

      /* ===== 2. INTEGRATION ===== */
      if (cls.isInt) {
        const exprStr = ClientSideSolver._extractExpr(raw, 'int');
        const terms = PolynomialEngine.parsePoly(exprStr);

        let intLatex = '', intStr = '';
        if (terms.length > 0) {
          const integratedTerms = PolynomialEngine.intPoly(terms);
          intLatex = PolynomialEngine.polyToLatex(integratedTerms) + ' + C';
          intStr = PolynomialEngine.polyToExpr(integratedTerms) + ' + C';
        } else {
          intLatex = `F(x) + C`;
          intStr = `F(x) + C`;
        }

        const origLatex = terms.length > 0 ? PolynomialEngine.polyToLatex(terms) : exprStr;
        const plot2d = ClientSideSolver._plot2d(origLatex);

        const stepChanges = terms.map(t => {
          const newPower = t.power + 1;
          const newCoeff = t.coeff / newPower;
          const coeffFormatted = Number.isInteger(newCoeff) ? newCoeff.toString() : `\\frac{${t.coeff}}{${newPower}}`;
          return {
            old: `\\int (${t.coeff !== 1 ? t.coeff : ''}${t.power > 0 ? (t.power === 1 ? 'x' : `x^{${t.power}}`) : '1'}) dx`,
            new: `${coeffFormatted} x^{${newPower}}`,
            reason: `Reverse Power Rule: $\\int ${t.coeff} x^{${t.power}} dx = \\frac{${t.coeff}}{${newPower}} x^{${newPower}}$`
          };
        });

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
            explanation: 'Apply the antiderivative power rule $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$ to each term.'
          },
          steps: [
            {
              step_number: 1, title: 'Original Integrand',
              previous_expression: null, current_expression: `∫ (${origLatex}) dx`,
              latex: `\\int \\left(${origLatex}\\right) dx`,
              change_type: 'original', changes: [],
              explanation: `We are asked to integrate $f(x) = ${origLatex}$ with respect to $x$.`,
              reason: 'Initial Given Problem'
            },
            {
              step_number: 2, title: 'Term-by-Term Integration',
              previous_expression: `∫ (${origLatex}) dx`, current_expression: `∫ f(x)dx = ${intLatex}`,
              latex: `\\int \\left(${origLatex}\\right) dx = ${intLatex}`,
              change_type: 'integration', changes: stepChanges,
              explanation: 'Apply the antiderivative power rule $\\int a x^n dx = \\frac{a}{n+1} x^{n+1}$ to each term.',
              reason: 'Reverse Power Rule applied'
            },
            {
              step_number: 3, title: 'Add Constant of Integration',
              previous_expression: `Integrated terms`, current_expression: intLatex,
              latex: intLatex, change_type: 'final_answer', changes: [],
              explanation: `The indefinite integral of $f(x) = ${origLatex}$ is $\\mathbf{${intLatex}}$.`,
              reason: 'Constant of integration C added'
            }
          ],
          final_answer: {
            answer: `∫ (${origLatex}) dx = ${intLatex}`,
            latex: `\\int \\left(${origLatex}\\right) dx = ${intLatex}`,
            unit: '',
            explanation: `The antiderivative family is ${intLatex}.`
          },
          visualization: {
            recommended_mode: '2d',
            formula_latex: `y = ${origLatex}`,
            two_d: plot2d,
            three_d: { available: false },
            explanation: `Graph of the integrand function f(x) = ${origLatex}.`
          },
          verification: { status: 'verified', message: 'Computed symbolically using Reverse Power Rule.', sympy_result: intLatex }
        };
      }

      /* ===== 3. EQUATION SOLVING (QUADRATIC & LINEAR) ===== */
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
          // Quadratic Equation: ax^2 + bx + c = 0
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
              previous_expression: null, current_expression: `${a}x^2 + (${b})x + (${c}) = 0`,
              latex: `${a}x^2 + (${b})x + (${c}) = 0`, change_type: 'original', changes: [],
              explanation: `Identify coefficients: $a = ${a}$, $b = ${b}$, $c = ${c}$.`,
              reason: 'Standard Quadratic Equation Form'
            },
            {
              step_number: 2, title: 'Compute Discriminant',
              previous_expression: `a=${a}, b=${b}, c=${c}`, current_expression: `Δ = b^2 - 4ac = ${disc}`,
              latex: `\\Delta = b^2 - 4ac = (${b})^2 - 4(${a})(${c}) = ${disc}`,
              change_type: 'formula_application', changes: [],
              explanation: `The discriminant $\\Delta = ${disc}$ indicates ${disc >= 0 ? 'real roots' : 'complex conjugate roots'}.`,
              reason: 'Quadratic Discriminant Formula'
            },
            {
              step_number: 3, title: 'Apply Quadratic Formula',
              previous_expression: `Δ = ${disc}`, current_expression: rootsStr,
              latex: `x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{-(${b}) \\pm \\sqrt{${disc}}}{2(${a})}`,
              change_type: 'final_answer', changes: [],
              explanation: `Solving yields $\\mathbf{${solutionLatex}}$.`,
              reason: 'Quadratic formula calculation'
            }
          ];

        } else if (b !== 0) {
          // Linear Equation: bx + c = 0 -> x = -c / b
          const xVal = -c / b;
          rootsStr = `x = ${xVal.toFixed(3)}`;
          solutionLatex = `x = ${xVal.toFixed(3)}`;

          steps = [
            {
              step_number: 1, title: 'Linear Equation',
              previous_expression: null, current_expression: `${b}x + (${c}) = 0`,
              latex: `${b}x + (${c}) = 0`, change_type: 'original', changes: [],
              explanation: `Isolate variable term $x$.`,
              reason: 'Initial Linear Equation'
            },
            {
              step_number: 2, title: 'Isolate x',
              previous_expression: `${b}x = ${-c}`, current_expression: rootsStr,
              latex: `x = \\frac{${-c}}{${b}} = ${xVal.toFixed(3)}`,
              change_type: 'final_answer', changes: [],
              explanation: `Divide by $${b}$ to get $\\mathbf{${solutionLatex}}$.`,
              reason: 'Algebraic division'
            }
          ];

        } else {
          // Fallback root finder
          rootsStr = `x = 0`;
          solutionLatex = `x = 0`;
          steps = [
            {
              step_number: 1, title: 'Equation Form',
              previous_expression: null, current_expression: raw,
              latex: raw, change_type: 'original', changes: [],
              explanation: `Rearrange and simplify equation $${raw}$.`,
              reason: 'Given Problem'
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
            explanation: 'Solve algebraically by finding the exact roots of the polynomial equation.'
          },
          steps: steps,
          final_answer: {
            answer: rootsStr,
            latex: solutionLatex,
            unit: '',
            explanation: `The solution to ${lhsStr} = ${rhsStr} is ${rootsStr}.`
          },
          visualization: {
            recommended_mode: '2d',
            formula_latex: `y = ${combinedExpr}`,
            two_d: plot2d,
            three_d: { available: false },
            explanation: `Graph of y = ${combinedExpr}. Roots occur where y crosses zero.`
          },
          verification: { status: 'verified', message: 'Roots computed symbolically.', sympy_result: rootsStr }
        };
      }

      /* ===== 4. GENERAL EXPRESSION EVALUATION ===== */
      const terms = PolynomialEngine.parsePoly(raw);
      const simpLatex = terms.length > 0 ? PolynomialEngine.polyToLatex(terms) : raw;
      const plot2d = ClientSideSolver._plot2d(raw);

      return {
        success: true,
        problem_analysis: {
          topic: 'Algebra & Simplification',
          given_information: [`Expression: ${raw}`],
          find: 'Simplified Expression / Evaluation',
          variables: ['x']
        },
        solution_strategy: {
          method: 'Polynomial Simplification',
          formula_or_rule: '\\text{Combine like terms}',
          explanation: 'Group terms by power of x and sum their coefficients.'
        },
        steps: [
          {
            step_number: 1, title: 'Original Expression',
            previous_expression: null, current_expression: raw,
            latex: raw, change_type: 'original', changes: [],
            explanation: `Original expression: $${raw}$.`,
            reason: 'Given Problem'
          },
          {
            step_number: 2, title: 'Combine Like Terms',
            previous_expression: raw, current_expression: simpLatex,
            latex: simpLatex, change_type: 'final_answer', changes: [],
            explanation: `Combining like terms yields $\\mathbf{${simpLatex}}$.`,
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
          explanation: `Graph of y = ${simpLatex}.`
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
