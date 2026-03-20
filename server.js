const http = require("http");
const fs = require("fs");

// ---------- DATA ----------
const questions = [
  { id: 1, question: "What is 2 + 2?", options: ["3", "4", "5"], correct: "4" },
  { id: 2, question: "What is 5 × 2?", options: ["10", "8", "12"], correct: "10" },
  { id: 3, question: "What is 9 - 3?", options: ["6", "5", "7"], correct: "6" },
  { id: 4, question: "What is 10 / 2?", options: ["5", "2", "10"], correct: "5" }
];

// ---------- HELPERS ----------
function readJSON(file, fallback = []) {
  try {
    const data = fs.readFileSync(file, "utf-8");
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function parseBody(req) {
  return new Promise(resolve => {
    let body = "";
    req.on("data", chunk => (body += chunk.toString()));
    req.on("end", () => resolve(JSON.parse(body || "{}")));
  });
}

// ---------- LOAD DATA ----------
let tests = readJSON("tests.json", [
  { id: 1, name: "Basic Math Test", questionIds: [1, 2, 3] }
]);

// ---------- ROUTES ----------
function routeHome(res) {
  res.write(`
    <html><body style="text-align:center;margin-top:100px;font-family:Arial;">
      <h1>Assessment Platform</h1>
      <button onclick="location.href='/login'">Login</button>
    </body></html>
  `);
}

function routeLogin(res) {
  res.write(`
    <html><body style="text-align:center;margin-top:100px;font-family:Arial;">
      <h1>Select Role</h1>
      <button onclick="login('student')">Student</button>
      <button onclick="login('teacher')">Teacher</button>
      <script>
        function login(role){
          localStorage.setItem("role",role);
          window.location.href = role==="teacher"?"/dashboard":"/tests";
        }
      </script>
    </body></html>
  `);
}

function routeTests(res) {
  const list = tests.map(t => `
    <div><a href="/test?id=${t.id}">
      <button>${t.name}</button>
    </a></div>
  `).join("");

  res.write(`<html><body style="padding:40px;font-family:Arial;">
    <h1>Select Test</h1>${list}
  </body></html>`);
}

async function routeSubmit(req, res) {
  const data = await parseBody(req);
  let results = readJSON("results.json");

  results.push({
    ...data,
    date: new Date().toISOString()
  });

  writeJSON("results.json", results);

  res.write(JSON.stringify({ status: "saved" }));
  res.end();
}

function routeTestPage(req, res) {
  const url = new URL(req.url, "http://localhost");
  const id = parseInt(url.searchParams.get("id"));

  const test = tests.find(t => t.id === id);
  if (!test) return res.end("<h1>Not found</h1>");

  const testQuestions = test.questionIds.map(i =>
    questions.find(q => q.id === i)
  );

  const html = testQuestions.map((q, i) => `
    <div>
      <p><b>Q${i + 1}: ${q.question}</b></p>
      ${q.options.map(o => `
        <input type="radio" name="q${q.id}" value="${o}"> ${o}<br>
      `).join("")}
    </div>
  `).join("");

  res.write(`
    <html><body style="padding:40px;font-family:Arial;">
      <h1>${test.name}</h1>
      <input id="name" placeholder="Your name"/>

      ${html}

      <button onclick="submitTest()">Submit</button>
      <p id="result"></p>

      <script>
        const qs=${JSON.stringify(testQuestions)};

        function submitTest(){
          const name=document.getElementById("name").value;
          if(!name){alert("Enter name");return;}

          let score=0;
          qs.forEach(q=>{
            const s=document.querySelector('input[name="q'+q.id+'"]:checked');
            if(s&&s.value===q.correct) score++;
          });

          fetch("/submit",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({name,score,total:qs.length,testName:"${test.name}"})
          });

          result.innerText=name+" scored "+score+"/"+qs.length;
        }
      </script>
    </body></html>
  `);
}

function routeDashboard(res) {
  let results = readJSON("results.json");

  const avg = results.reduce((s, r) => s + r.score, 0) / results.length || 0;

  const rows = results.map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.testName}</td>
      <td>${r.score}/${r.total}</td>
    </tr>
  `).join("");

  res.write(`
    <html><body style="padding:40px;font-family:Arial;">
      <script>
        if(localStorage.getItem("role")!=="teacher"){
          alert("Access denied"); location.href="/login";
        }
      </script>

      <h1>Dashboard</h1>
      <p>Average: ${avg.toFixed(2)}</p>

      <table border="1">
        <tr><th>Name</th><th>Test</th><th>Score</th></tr>
        ${rows}
      </table>
    </body></html>
  `);
}

// ---------- SERVER ----------
const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") return res.end();

  res.setHeader("Content-Type", "text/html; charset=UTF-8");

  if (req.url === "/") return routeHome(res);
  if (req.url === "/login") return routeLogin(res);
  if (req.url === "/tests") return routeTests(res);
  if (req.url.startsWith("/test")) return routeTestPage(req, res);
  if (req.url === "/dashboard") return routeDashboard(res);
  if (req.url === "/submit" && req.method === "POST") return routeSubmit(req, res);

  res.end("<h1>404</h1>");
});

server.listen(3000, () => console.log("http://localhost:3000"));