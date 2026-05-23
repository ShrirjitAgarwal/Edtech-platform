const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { readJSON, writeJSON } = require("../utils/file");
const authMiddleware = require("../middleware/auth");
const Test = require("../models/Test");
const layout = require("../views/layout");
const backButton = require("../views/backButton");
const {
  judgeSubmission
} = require("../services/codeJudge");
// ---------- NAVBAR ----------
function navbar(){
return `
<div style="
position:fixed;
top:0;
left:0;
z-index:1000;
width:100%;
background:#333;
padding:10px;
display:flex;
gap:10px;
width:100%;
box-sizing:border-box;
">
<button onclick="go('/teacher')" class="nav-btn">Dashboard</button>
<button onclick="go('/library')" class="nav-btn">Library</button>
<button onclick="go('/teacher-tests')" class="nav-btn">Tests</button>
<button onclick="go('/classes')" class="nav-btn">Classes</button>
<button onclick="logout()" class="nav-btn logout">Logout</button>
</div>
<style>
  .nav-btn {
    padding:8px 14px;
    background:white;
    color:black;
    border:none;
    border-radius:6px;
    cursor:pointer;
  }
  .nav-btn:hover { background:#ddd; }
  .logout { background:#ff4d4d; color:white; }
</style>
<script>
function go(path){
  window.location.replace(path);
}
function logout(){
  localStorage.clear();
  window.location.replace("/");
}
</script>
`;
}

module.exports = router;
