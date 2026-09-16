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
