const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
let hasFailure = false;
let hasWarning = false;
function section(title) {
  console.log("");
  console.log("=== " + title + " ===");
}
function pass(message) {
  console.log("PASS  " + message);
}
function warn(message) {
  hasWarning = true;
  console.log("WARN  " + message);
}
function fail(message) {
  hasFailure = true;
  console.log("FAIL  " + message);
}
function run(command) {
  return childProcess
    .execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    })
    .trim();
}
function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}
function getFilesRecursive(dirPath) {
  const absoluteDir = path.join(process.cwd(), dirPath);
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }
  const entries = fs.readdirSync(absoluteDir, {
    withFileTypes: true
  });
  let files = [];
  entries.forEach(entry => {
    const relativePath = path.join(dirPath, entry.name);
    const absolutePath = path.join(process.cwd(), relativePath);
    if (entry.isDirectory()) {
      files = files.concat(getFilesRecursive(relativePath));
      return;
    }
    if (entry.isFile() && absolutePath.endsWith(".js")) {
      files.push(relativePath);
    }
  });
  return files;
}
function checkGitState() {
  section("Git State");
  let status = "";
  try {
    status = run("git status --short");
  } catch (err) {
    fail("Unable to read git status");
    return;
  }
  const changedFiles = status
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
  if (!changedFiles.length) {
    pass("Working tree is clean");
  } else {
    warn("Working tree has uncommitted files");
    changedFiles.forEach(line => {
      console.log("      " + line);
    });
  }
  try {
    const head = run("git rev-parse HEAD");
    const branch = run("git rev-parse --abbrev-ref HEAD");
    const origin = run("git rev-parse origin/" + branch);
    console.log("      local HEAD:  " + head);
    console.log("      origin HEAD: " + origin);
    if (head === origin) {
      pass("Local HEAD matches origin/" + branch);
    } else {
      fail("Local HEAD does not match origin/" + branch + ". Push before deploying.");
    }
  } catch (err) {
    warn("Could not compare local HEAD with origin branch. Run git fetch first if needed.");
  }
}
function checkPackageManager() {
  section("Package Manager");
  const hasPackageLock = fileExists("package-lock.json");
  const hasYarnLock = fileExists("yarn.lock");
  if (hasPackageLock && hasYarnLock) {
    warn("Both package-lock.json and yarn.lock exist. Use one package manager only.");
    return;
  }
  if (hasPackageLock) {
    pass("Using npm/package-lock.json");
    return;
  }
  if (hasYarnLock) {
    pass("Using yarn/yarn.lock");
    return;
  }
  warn("No package lock file found");
}
function checkSyntax() {
  section("Syntax Check");
  const filesToCheck = [
    "server.js",
    "config/validateEnv.js",
    "data/config/db.js",
    ...getFilesRecursive("routes"),
    ...getFilesRecursive("controllers"),
    ...getFilesRecursive("models"),
    ...getFilesRecursive("middleware")
  ];
  filesToCheck.forEach(filePath => {
    try {
      run("node -c " + JSON.stringify(filePath));
      pass("Syntax OK: " + filePath);
    } catch (err) {
      fail("Syntax failed: " + filePath);
      console.log(String(err.stderr || err.message || err));
    }
  });
}
function checkRouteLoad() {
  section("Route Load Check");
  const routeFiles = getFilesRecursive("routes");
  if (!routeFiles.length) {
    fail("No route files found");
    return;
  }
  routeFiles.forEach(filePath => {
    try {
      require(path.join(process.cwd(), filePath));
      pass("Loaded route file: " + filePath);
    } catch (err) {
      fail("Failed to load route file: " + filePath);
      console.log(err.stack || err.message || err);
    }
  });
}
function extractBackendRoutes() {
  const routeFiles = getFilesRecursive("routes");
  const routes = [];
  routeFiles.forEach(filePath => {
    const content = fs.readFileSync(path.join(process.cwd(), filePath), "utf8");
    const regex = /router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g;
    let match;
    while ((match = regex.exec(content))) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        file: filePath
      });
    }
  });
  return routes;
}
function extractFrontendFetches() {
  const scanDirs = [
    "routes",
    "controllers",
    "views",
    "public"
  ];
  const fetches = [];
  scanDirs.forEach(dir => {
    const files = getFilesRecursive(dir);
    files.forEach(filePath => {
      const content = fs.readFileSync(path.join(process.cwd(), filePath), "utf8");
      const regex = /fetch\(\s*["'`]([^"'`]+)["'`]/g;
      let match;
      while ((match = regex.exec(content))) {
        const fetchPath = match[1];
        if (!fetchPath.startsWith("/")) {
          return;
        }
        fetches.push({
          path: fetchPath,
          file: filePath
        });
      }
    });
  });
  return fetches;
}
function normalizePath(value) {
  return String(value || "")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";
}
function routeMatchesFetch(routePath, fetchPath) {
  const normalizedRoute = normalizePath(routePath);
  const normalizedFetch = normalizePath(fetchPath);
  if (normalizedRoute === normalizedFetch) {
    return true;
  }
  const routeParts = normalizedRoute.split("/");
  const fetchParts = normalizedFetch.split("/");
  if (routeParts.length !== fetchParts.length) {
    return false;
  }
  return routeParts.every((part, index) => {
    if (part.startsWith(":")) {
      return true;
    }
    return part === fetchParts[index];
  });
}
function checkFetchRouteMatching() {
  section("Frontend Fetch Route Matching");
  const backendRoutes = extractBackendRoutes();
  const frontendFetches = extractFrontendFetches();
  if (!frontendFetches.length) {
    warn("No frontend fetch calls found");
    return;
  }
  frontendFetches.forEach(fetchCall => {
    const matched = backendRoutes.some(route =>
      routeMatchesFetch(route.path, fetchCall.path)
    );
    if (matched) {
      pass("Fetch has matching route: " + fetchCall.path + " (" + fetchCall.file + ")");
    } else {
      fail("Fetch may not have matching backend route: " + fetchCall.path + " (" + fetchCall.file + ")");
    }
  });
}
function readProjectFile(filePath) {
  const absolutePath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function containsAll(content, patterns) {
  return patterns.every(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(content);
    }
    return content.includes(pattern);
  });
}

function checkCriticalAction(name, filePath, patterns) {
  const content = readProjectFile(filePath);

  if (!content) {
    fail("Critical action file missing: " + filePath + " for " + name);
    return;
  }

  const missingPatterns = patterns.filter(pattern => {
    if (pattern instanceof RegExp) {
      return !pattern.test(content);
    }
    return !content.includes(pattern);
  });

  if (!missingPatterns.length) {
    pass("Critical action wired: " + name + " (" + filePath + ")");
    return;
  }

  fail("Critical action may be broken: " + name + " (" + filePath + ")");
  missingPatterns.forEach(pattern => {
    console.log("      Missing: " + String(pattern));
  });
}

function checkCriticalFrontendActions() {
  section("Critical Frontend Action Check");

  checkCriticalAction(
    "Create Test - Save Test",
    "routes/teacherTestRoutes.js",
    [
      'id="saveTestButton"',
      "function saveTest()",
      'event.target.closest("#saveTestButton")',
      "saveTest();",
      'fetch("/api/teacher/tests/save"'
    ]
  );

  checkCriticalAction(
    "Test Settings - Save Settings",
    "routes/teacherTestRoutes.js",
    [
      'id="saveTestSettingsButton"',
      "function saveSettings()",
      'event.target.closest("#saveTestSettingsButton")',
      "saveSettings();",
      'fetch("/api/teacher/tests/settings/save"'
    ]
  );

  checkCriticalAction(
    "Teacher Tests - Publish/Assign",
    "routes/teacherTestRoutes.js",
    [
      'class="assign-test-button"',
      "function assignTest(testId)",
      'fetch("/api/teacher/tests/assign"'
    ]
  );

  checkCriticalAction(
    "Teacher Tests - Delete Selected",
    "routes/teacherTestRoutes.js",
    [
      'id="deleteSelectedTestsButton"',
      "const deleteSelectedTestsButton = document.getElementById(\"deleteSelectedTestsButton\")",
      "deleteSelectedTestsButton.addEventListener(\"click\", deleteSelected)",
      "function deleteSelected()",
      'fetch("/api/teacher/tests/delete-multiple"'
    ]
  );

  checkCriticalAction(
    "Platform Schools - Create Platform Admin",
    "controllers/platformSchoolController.js",
    [
      'id="createPlatformAdminButton"',
      "function createPlatformAdmin()",
      "createPlatformAdminButton.addEventListener",
      'fetch("/api/platform/admins/create"'
    ]
  );

  checkCriticalAction(
    "Student Entry - Lookup",
    "routes/studentRoutes.js",
    [
      'fetch("/api/student/lookup"',
      "studentSessionToken"
    ]
  );
}
function checkCriticalUncommittedFiles() {
  section("Critical File Commit Check");
  let status = "";
  try {
    status = run("git status --short");
  } catch (err) {
    warn("Could not check critical file status");
    return;
  }
  const criticalPatterns = [
    "server.js",
    "routes/",
    "controllers/",
    "models/",
    "middleware/",
    "data/config/",
    "config/"
  ];
  const criticalChanges = status
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => {
      const filePath = line.slice(3).trim();
      return criticalPatterns.some(pattern =>
        filePath === pattern || filePath.startsWith(pattern)
      );
    });
  if (!criticalChanges.length) {
    pass("No uncommitted critical app files");
    return;
  }
  warn("Uncommitted critical app files exist. Render will not have these unless committed and pushed.");
  criticalChanges.forEach(line => {
    console.log("      " + line);
  });
}
function checkProductionEnvShape() {
  section("Production Env Shape");
  const requiredInProduction = [
    "JWT_SECRET",
    "MONGO_URI",
    "JUDGE_PROVIDER",
    "LOCAL_CODE_EXECUTION_ENABLED",
    "PLATFORM_ADMIN_EMAIL"
  ];
  requiredInProduction.forEach(name => {
    if (process.env[name]) {
      pass("Env present in current shell: " + name);
    } else {
      warn("Env not present in current shell: " + name + " Render must have this set");
    }
  });
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    fail("JWT_SECRET is present but shorter than 32 characters");
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.LOCAL_CODE_EXECUTION_ENABLED !== "false"
  ) {
    fail("LOCAL_CODE_EXECUTION_ENABLED must be false in production");
  }
}
function printFinalStatus() {
  section("Final Status");
  if (hasFailure) {
    console.log("DO NOT DEPLOY");
    process.exit(1);
  }
  if (hasWarning) {
    console.log("DEPLOY WITH CAUTION");
    process.exit(0);
  }
  console.log("READY TO DEPLOY");
  process.exit(0);
}
console.log("");
console.log("Deploy Check Report");
console.log("Time: " + new Date().toISOString());
checkGitState();
checkPackageManager();
checkSyntax();
checkRouteLoad();
checkFetchRouteMatching();
checkCriticalFrontendActions();
checkCriticalUncommittedFiles();
checkProductionEnvShape();
printFinalStatus();