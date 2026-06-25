const sidebar = require("./sidebar");
function layout(content, active = "") {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.7.0/dist/tabler-icons.min.css">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --ink:#11161d;
    --ink-soft:#1b232e;
    --slate:#3a4654;
    --paper:#faf9f6;
    --line-dark:rgba(17,22,29,0.10);
    --accent:#e0633a;
    --sans:'Inter',system-ui,sans-serif;
    --display:'Fraunces',Georgia,serif;
  }
  body{font-family:var(--sans);background:var(--paper);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;}
  a{color:inherit;text-decoration:none}
</style>
</head>
<body>
<div style="display:flex;height:100vh;">
  ${sidebar(active)}
  <div style="
    flex:1;
    padding:32px 40px;
    background:var(--paper);
    overflow:auto;
  ">
    ${content}
  </div>
</div>
<script>
(function(){
  const layoutUser = JSON.parse(localStorage.getItem("user") || "null");
  if(
    !layoutUser ||
    (
      layoutUser.role !== "teacher" &&
      layoutUser.role !== "admin"
    )
  ){
    window.location.replace("/");
    return;
  }
  const currentPath = window.location.pathname + window.location.search;
  const lastInternalPath = sessionStorage.getItem("lastInternalPath");
  window.go = function(path){
    sessionStorage.setItem("lastInternalPath", currentPath);
    window.location.replace(path);
  };
  window.goBack = function(fallbackPath = "/"){
    if(lastInternalPath && lastInternalPath !== currentPath){
      window.location.replace(lastInternalPath);
      return;
    }
    window.location.replace(fallbackPath);
  };
  window.logout = function(){
    fetch("/logout", {
      method: "POST"
    }).finally(() => {
      localStorage.clear();
      window.location.replace("/");
    });
  };
  window.toggleManage = function(){
    const menu = document.getElementById("manageMenu");
    if(!menu) return;
    menu.style.display =
      menu.style.display === "none"
        ? "block"
        : "none";
  };
})();
</script>
</body>
</html>
`;
}
module.exports = layout;
