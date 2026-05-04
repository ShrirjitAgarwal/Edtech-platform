const sidebar = require("./sidebar");
function layout(content, active = "") {
  return `
<body style="margin:0;font-family:Arial;">
<div style="display:flex;height:100vh;">
  ${sidebar(active)}
  <div style="
    flex:1;
    padding:30px 36px;
    background:#eef2ff;
    overflow:auto;
  ">
    ${content}
  </div>
</div>
<script>
(function(){
  const layoutUser = JSON.parse(localStorage.getItem("user") || "null");
  if(!layoutUser || layoutUser.role !== "teacher"){
    window.location.replace("/");
    return;
  }
  window.go = function(path){
    window.location.replace(path);
  };
  window.logout = function(){
    localStorage.clear();
    window.location.replace("/");
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
`;
}
module.exports = layout;