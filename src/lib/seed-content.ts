import type { Block, Lesson, Module, NotePage, Question, Quiz } from "./types";

const r = String.raw;
const h = (text: string): Block => ({ t: "h", text });
const p = (text: string): Block => ({ t: "p", text });
const m = (tex: string): Block => ({ t: "math", tex });
const ul = (...items: string[]): Block => ({ t: "list", items });
const note = (text: string): Block => ({ t: "note", text });
const page = (...blocks: Block[]): NotePage => ({ blocks });

let qn = 0;
const qid = () => `sq-${++qn}`;
function mcq(prompt: string, options: string[], correct: number, explanation: string, marks = 1): Question {
  return { id: qid(), type: "mcq", prompt, options, correct: [correct], accepted: [], marks, explanation };
}
function mcma(prompt: string, options: string[], correct: number[], explanation: string, marks = 2): Question {
  return { id: qid(), type: "mcma", prompt, options, correct, accepted: [], marks, explanation };
}
function blank(prompt: string, accepted: string[], explanation: string, marks = 1): Question {
  return { id: qid(), type: "blank", prompt, options: [], correct: [], accepted, marks, explanation };
}

export const seedModules: Module[] = [
  { id: "m-am", title: "Applied Mathematics", description: "Laplace transforms and how engineers use them to solve differential equations.", cover: "book", createdAt: 1 },
  { id: "m-ph", title: "Physics", description: "Motion, forces and energy — the mechanics that everything else is built on.", cover: "flask", createdAt: 2 },
  { id: "m-be", title: "Battery Electrochemistry", description: "How cells store energy, lithium-ion chemistry, and why batteries age.", cover: "battery", createdAt: 3 },
  { id: "m-pf", title: "Programming Fundamentals", description: "C++ from the ground up: types, control flow and functions.", cover: "laptop", createdAt: 4 },
  { id: "m-st", title: "Statistics", description: "Describing data, reasoning about chance and testing hypotheses.", cover: "chart", createdAt: 5 },
  { id: "m-cs", title: "Control Systems", description: "Transfer functions, block diagrams and stability of feedback loops.", cover: "bear", createdAt: 6 },
];

function notes(id: string, moduleId: string, order: number, title: string, summary: string, pages: NotePage[]): Lesson {
  return { id, moduleId, order, title, summary, source: { kind: "notes", pages } };
}

export const seedLessons: Lesson[] = [
  notes("l-am-1", "m-am", 1, "Laplace Transform", "Introduction to Laplace transform and basic properties.", [
    page(
      h("1.1 Why transform at all?"),
      p("Many engineering systems are described by linear differential equations. Solving them directly in the time domain can be tedious, especially with discontinuous inputs such as switches and impulses."),
      p("The Laplace transform turns calculus into algebra: derivatives become multiplications by $s$, and a differential equation becomes a polynomial equation we can rearrange."),
      note("Big idea: transform → solve algebraically → transform back."),
    ),
    page(
      h("1.2 Where it fits"),
      ul(
        "Circuit analysis — RC, RL and RLC networks",
        "Mechanical vibration — mass–spring–damper systems",
        "Control systems — transfer functions and stability",
        "Signal processing — filters and system responses",
      ),
      p("In every case the input is a function of time $t \\ge 0$ and we care about the response from $t = 0$ onward."),
    ),
    page(
      h("2.1 Definition of Laplace Transform"),
      p("The Laplace transform converts a time-domain function $f(t)$ into a complex-frequency domain function $F(s)$."),
      m(r`\mathcal{L}\{f(t)\} = \int_0^{\infty} e^{-st} f(t)\, dt`),
      p("where:"),
      ul("$s$ is a complex variable", "$f(t)$ is defined for $t \\ge 0$"),
    ),
    page(
      h("2.2 Existence"),
      p("The integral converges when $f(t)$ is piecewise continuous and of exponential order, meaning there are constants $M$ and $a$ with"),
      m(r`|f(t)| \le M e^{at} \quad \text{for large } t`),
      p("Then $F(s)$ exists for all $\\operatorname{Re}(s) > a$. Functions like $e^{t^2}$ grow too fast and have no Laplace transform."),
    ),
    page(
      h("2.3 Standard transforms"),
      m(r`\mathcal{L}\{1\} = \frac{1}{s} \qquad \mathcal{L}\{t^n\} = \frac{n!}{s^{n+1}}`),
      m(r`\mathcal{L}\{e^{at}\} = \frac{1}{s-a} \qquad \mathcal{L}\{\sin \omega t\} = \frac{\omega}{s^2+\omega^2}`),
      m(r`\mathcal{L}\{\cos \omega t\} = \frac{s}{s^2+\omega^2}`),
      note("Memorise these five — almost every exam question reduces to them."),
    ),
    page(
      h("3.1 Linearity & shifting"),
      m(r`\mathcal{L}\{af + bg\} = aF(s) + bG(s)`),
      p("First shifting theorem — multiplying by an exponential shifts $s$:"),
      m(r`\mathcal{L}\{e^{at} f(t)\} = F(s-a)`),
    ),
    page(
      h("3.2 Transform of derivatives"),
      m(r`\mathcal{L}\{f'(t)\} = sF(s) - f(0)`),
      m(r`\mathcal{L}\{f''(t)\} = s^2F(s) - s f(0) - f'(0)`),
      p("Initial conditions enter automatically — this is what makes the method so convenient for initial value problems."),
    ),
  ]),
  notes("l-am-2", "m-am", 2, "Inverse Laplace Transform", "Partial fractions, convolution and complex methods.", [
    page(
      h("1.1 Going back"),
      p("The inverse transform recovers $f(t)$ from $F(s)$:"),
      m(r`f(t) = \mathcal{L}^{-1}\{F(s)\}`),
      p("In practice we rarely integrate. We rewrite $F(s)$ as a sum of standard forms and read the answer from a table."),
    ),
    page(
      h("1.2 Partial fractions — distinct roots"),
      m(r`\frac{3s+5}{(s+1)(s+2)} = \frac{A}{s+1} + \frac{B}{s+2}`),
      p("Cover-up rule: $A = \\left.\\frac{3s+5}{s+2}\\right|_{s=-1} = 2$ and $B = \\left.\\frac{3s+5}{s+1}\\right|_{s=-2} = 1$."),
      m(r`f(t) = 2e^{-t} + e^{-2t}`),
    ),
    page(
      h("1.3 Repeated & quadratic factors"),
      p("A repeated root $(s+a)^2$ needs two terms, $\\frac{A}{s+a} + \\frac{B}{(s+a)^2}$, giving $Ae^{-at} + Bte^{-at}$."),
      p("An irreducible quadratic is completed to the square and matched to shifted sine and cosine forms:"),
      m(r`\frac{s+1}{(s+1)^2+4} \;\longrightarrow\; e^{-t}\cos 2t`),
    ),
    page(
      h("2.1 Convolution"),
      m(r`(f*g)(t) = \int_0^t f(\tau)\, g(t-\tau)\, d\tau`),
      m(r`\mathcal{L}\{f*g\} = F(s)\,G(s)`),
      note("A product in the s-domain is a convolution in the time domain."),
    ),
    page(
      h("2.2 Worked example"),
      p("Find $\\mathcal{L}^{-1}\\left\\{\\frac{1}{s(s+1)}\\right\\}$ using convolution with $f = 1$ and $g = e^{-t}$:"),
      m(r`\int_0^t 1\cdot e^{-(t-\tau)}\,d\tau = 1 - e^{-t}`),
      p("Check with partial fractions: $\\frac{1}{s} - \\frac{1}{s+1}$ gives the same result."),
    ),
  ]),
  notes("l-am-3", "m-am", 3, "Applications", "Solving differential equations and engineering applications.", [
    page(
      h("1.1 Solving an ODE"),
      p("Solve $y'' + 3y' + 2y = 0$ with $y(0) = 1$, $y'(0) = 0$."),
      m(r`s^2Y - s + 3(sY - 1) + 2Y = 0`),
      m(r`Y(s) = \frac{s+3}{(s+1)(s+2)} = \frac{2}{s+1} - \frac{1}{s+2}`),
      m(r`y(t) = 2e^{-t} - e^{-2t}`),
    ),
    page(
      h("1.2 RC circuit"),
      p("A capacitor charges through resistor $R$ from a step voltage $V$. With $v_C(0)=0$:"),
      m(r`RC\,v_C' + v_C = V \;\Rightarrow\; V_C(s) = \frac{V}{s(RCs+1)}`),
      m(r`v_C(t) = V\left(1 - e^{-t/RC}\right)`),
      note("$\\tau = RC$ is the time constant — the capacitor reaches 63% after one $\\tau$."),
    ),
    page(
      h("1.3 Transfer functions"),
      p("With zero initial conditions, the ratio of output to input transforms is the transfer function:"),
      m(r`G(s) = \frac{Y(s)}{U(s)}`),
      p("It describes the system independently of the input — the foundation of control systems."),
    ),
  ]),

  notes("l-ph-1", "m-ph", 1, "Kinematics", "Describing motion with displacement, velocity and acceleration.", [
    page(h("1.1 Describing motion"), p("Velocity is the rate of change of displacement and acceleration is the rate of change of velocity:"), m(r`v = \frac{dx}{dt}, \qquad a = \frac{dv}{dt}`)),
    page(h("1.2 Constant acceleration"), m(r`v = u + at`), m(r`s = ut + \tfrac{1}{2}at^2`), m(r`v^2 = u^2 + 2as`), note("Only valid when $a$ is constant.")),
    page(h("1.3 Projectiles"), p("Horizontal and vertical motion are independent. Horizontally $a = 0$; vertically $a = -g$ with $g \\approx 9.81\\,\\text{m/s}^2$."), m(r`R = \frac{u^2 \sin 2\theta}{g}`)),
  ]),
  notes("l-ph-2", "m-ph", 2, "Newton's Laws", "Forces, free-body diagrams and friction.", [
    page(h("1.1 The three laws"), ul("An object stays at rest or constant velocity unless a net force acts.", "$\\sum F = ma$", "Every action has an equal and opposite reaction.")),
    page(h("1.2 Free-body diagrams"), p("Isolate the body, draw every external force, choose axes, then apply $\\sum F = ma$ along each axis."), note("Weight $mg$ always acts downward; the normal force is perpendicular to the surface.")),
    page(h("1.3 Friction"), m(r`f_s \le \mu_s N, \qquad f_k = \mu_k N`), p("Kinetic friction is usually smaller than the maximum static friction.")),
  ]),
  notes("l-ph-3", "m-ph", 3, "Work & Energy", "Work, kinetic and potential energy, conservation.", [
    page(h("1.1 Work"), m(r`W = \int \mathbf{F}\cdot d\mathbf{s} = Fs\cos\theta`)),
    page(h("1.2 Energy"), m(r`E_k = \tfrac{1}{2}mv^2, \qquad E_p = mgh`), p("Work–energy theorem: the net work equals the change in kinetic energy.")),
    page(h("1.3 Power"), m(r`P = \frac{dW}{dt} = Fv`), note("1 W = 1 J/s.")),
  ]),

  notes("l-be-1", "m-be", 1, "Electrochemical Cells", "Redox reactions, electrodes and cell potential.", [
    page(h("1.1 Anatomy of a cell"), ul("Anode — oxidation happens here", "Cathode — reduction happens here", "Electrolyte — conducts ions, not electrons", "Separator — prevents short circuits")),
    page(h("1.2 Cell potential"), m(r`E^\circ_{cell} = E^\circ_{cathode} - E^\circ_{anode}`), p("A positive $E^\\circ_{cell}$ means the reaction is spontaneous (galvanic).")),
    page(h("1.3 Nernst equation"), m(r`E = E^\circ - \frac{RT}{nF}\ln Q`), note("$F = 96485\\,\\text{C/mol}$ is Faraday's constant.")),
  ]),
  notes("l-be-2", "m-be", 2, "Lithium-ion Chemistry", "Intercalation, cathode materials and energy density.", [
    page(h("1.1 Rocking-chair battery"), p("Lithium ions shuttle between graphite anode and metal-oxide cathode; neither electrode dissolves. This is called intercalation.")),
    page(h("1.2 Cathode families"), ul("LCO — high energy, used in phones", "NMC — balanced, used in EVs", "LFP — long life and very safe", "NCA — high energy, higher cost")),
    page(h("1.3 Energy"), m(r`E = Q \times V`), p("Specific energy is expressed in Wh/kg; energy density in Wh/L.")),
  ]),
  notes("l-be-3", "m-be", 3, "Degradation & State of Health", "Why batteries age and how we measure it.", [
    page(h("1.1 Ageing mechanisms"), ul("SEI layer growth consumes lithium", "Lithium plating at low temperature or fast charge", "Cathode cracking from repeated expansion")),
    page(h("1.2 State of health"), m(r`\text{SoH} = \frac{Q_{now}}{Q_{new}} \times 100\%`), note("An EV battery is often considered end-of-life at 70–80% SoH.")),
  ]),

  notes("l-pf-1", "m-pf", 1, "Variables & Types", "Declaring variables and C++'s built-in types.", [
    page(h("1.1 Declaring variables"), p("Every variable has a type, a name and (ideally) an initial value: `int count = 0;`"), ul("`int` — whole numbers", "`double` — decimals", "`char` — a single character", "`bool` — true or false")),
    page(h("1.2 Integer division"), p("Dividing two integers discards the remainder: `7 / 2` is `3`. Use `%` for the remainder: `7 % 2` is `1`."), note("Cast to `double` if you need a fractional result.")),
    page(h("1.3 const & auto"), p("`const` values cannot change after initialisation. `auto` lets the compiler infer the type from the initialiser.")),
  ]),
  notes("l-pf-2", "m-pf", 2, "Control Flow", "if/else, loops and switch statements.", [
    page(h("1.1 Branching"), p("`if`, `else if` and `else` choose between paths. `switch` is convenient for many discrete cases — remember `break`!")),
    page(h("1.2 Loops"), ul("`for` — known number of iterations", "`while` — repeat while a condition holds", "`do … while` — runs at least once")),
    page(h("1.3 Off-by-one"), p("`for (int i = 0; i < n; i++)` runs exactly $n$ times. Using `<=` runs $n + 1$ times."), note("Most loop bugs are off-by-one errors.")),
  ]),
  notes("l-pf-3", "m-pf", 3, "Functions", "Parameters, return values and pass-by-reference.", [
    page(h("1.1 Anatomy"), p("`int add(int a, int b) { return a + b; }` — return type, name, parameters, body.")),
    page(h("1.2 Value vs reference"), p("By default arguments are copied. Declaring a parameter as `int& x` lets the function modify the caller's variable."), note("Use `const T&` to avoid copying large objects you won't modify.")),
  ]),

  notes("l-st-1", "m-st", 1, "Descriptive Statistics", "Mean, median, variance and spread.", [
    page(h("1.1 Centre"), m(r`\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i`), p("The median is the middle value and is robust to outliers.")),
    page(h("1.2 Spread"), m(r`s^2 = \frac{1}{n-1}\sum (x_i - \bar{x})^2`), note("Divide by $n-1$ for a sample (Bessel's correction).")),
  ]),
  notes("l-st-2", "m-st", 2, "Probability", "Events, rules of probability and distributions.", [
    page(h("1.1 Rules"), m(r`P(A \cup B) = P(A) + P(B) - P(A \cap B)`), m(r`P(A \mid B) = \frac{P(A \cap B)}{P(B)}`)),
    page(h("1.2 Normal distribution"), p("About 68% of values lie within one standard deviation of the mean, 95% within two, 99.7% within three.")),
  ]),
  notes("l-st-3", "m-st", 3, "Hypothesis Testing", "Null hypotheses, p-values and significance.", [
    page(h("1.1 The logic"), p("Assume the null hypothesis $H_0$ is true, then ask how surprising the data would be. If the p-value is below $\\alpha$ (often 0.05), reject $H_0$.")),
    page(h("1.2 Errors"), ul("Type I — rejecting a true $H_0$ (false positive)", "Type II — failing to reject a false $H_0$ (false negative)")),
  ]),

  notes("l-cs-1", "m-cs", 1, "Transfer Functions", "Modelling systems in the s-domain.", [
    page(h("1.1 Definition"), m(r`G(s) = \frac{Y(s)}{U(s)}`), p("Poles are roots of the denominator; zeros are roots of the numerator.")),
    page(h("1.2 First-order system"), m(r`G(s) = \frac{K}{\tau s + 1}`), note("$K$ is the DC gain and $\\tau$ the time constant.")),
  ]),
  notes("l-cs-2", "m-cs", 2, "Block Diagrams", "Series, parallel and feedback connections.", [
    page(h("1.1 Combining blocks"), ul("Series: $G_1 G_2$", "Parallel: $G_1 + G_2$")),
    page(h("1.2 Negative feedback"), m(r`T(s) = \frac{G(s)}{1 + G(s)H(s)}`)),
  ]),
  notes("l-cs-3", "m-cs", 3, "Stability", "Pole locations and the Routh–Hurwitz criterion.", [
    page(h("1.1 Pole locations"), p("A linear system is stable if every pole has a negative real part — all poles in the left half of the s-plane.")),
    page(h("1.2 Routh–Hurwitz"), p("The number of sign changes in the first column of the Routh array equals the number of right-half-plane poles.")),
  ]),
];

/**
 * Placeholder questions — replace them from the app (Quizzes → ⋯ → Edit quiz) or here.
 * Pattern letters: m = MCQ, M = MCMA (multi-answer), b = fill in the blank.
 */
function placeholders(pattern: string, startAt = 1): Question[] {
  return [...pattern].map((c, i) => {
    const n = startAt + i;
    const prompt = `Placeholder question ${n} — replace with your own question.`;
    const explanation = "Placeholder explanation — add why the answer is correct.";
    if (c === "b") return blank(prompt, ["answer"], explanation);
    if (c === "M") return mcma(prompt, ["Option A", "Option B", "Option C", "Option D"], [0, 1], explanation);
    return mcq(prompt, ["Option A", "Option B", "Option C", "Option D"], 0, explanation);
  });
}

function quiz(id: string, moduleId: string, lessonId: string | null, title: string, timeLimitMin: number, createdAt: number, questions: Question[]): Quiz {
  return { id, moduleId, lessonId, title, timeLimitMin, createdAt, questions };
}

export const seedQuizzes: Quiz[] = [
  quiz("q-am-1", "m-am", "l-am-1", "Lesson 1 Quiz", 30, 1, [
    // the one real question, kept for testing
    mcq(r`What is the Laplace transform of $1$?`, [r`$\frac{1}{s}$`, "$s$", "$1$", "$0$"], 0, r`$\int_0^\infty e^{-st}dt = \frac{1}{s}$ for $s > 0$.`),
    ...placeholders("mmmmMmbmmmmMbmmmbMm", 2),
  ]),
  quiz("q-am-2", "m-am", "l-am-2", "Lesson 2 Quiz", 25, 2, placeholders("mmmbmmMmbm")),
  quiz("q-am-f", "m-am", null, "Final Quiz", 45, 3, placeholders("mmbmMmbmMmmb")),
  quiz("q-be-1", "m-be", "l-be-1", "Quiz 1", 20, 4, placeholders("mmmbMmmb")),
  quiz("q-ph-1", "m-ph", "l-ph-1", "Kinematics Quiz", 20, 5, placeholders("mmbMmm")),
  quiz("q-pf-1", "m-pf", "l-pf-1", "C++ Basics Quiz", 20, 6, placeholders("mbmMmmbm")),
  quiz("q-st-1", "m-st", "l-st-1", "Statistics Quiz 1", 15, 7, placeholders("mbmMm")),
  quiz("q-cs-1", "m-cs", "l-cs-1", "Control Quiz 1", 15, 8, placeholders("mmmbM")),
];
