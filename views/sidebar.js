function sidebar(active = "", role = "__USER_ROLE__") {
  const sidebarScript = `
<script>
(function(){
  const sidebarUser = JSON.parse(localStorage.getItem("user") || "null");
  const sidebarRole = sidebarUser?.role || "${role}";
  const sidebarIsStudent = sidebarRole === "student";
  const sidebarIsAdmin = sidebarRole === "admin";

  const sidebarItems = sidebarIsStudent
    ? [
        { key: "my-tests", label: "Dashboard", path: "/my-tests" }
      ]
    : sidebarIsAdmin
      ? [
          { key: "admin-dashboard", label: "Admin Dashboard", path: "/admin-dashboard" },
          { key: "admin-settings", label: "Admin Settings", path: "/admin-settings" },
          { key: "dashboard", label: "Teacher Dashboard", path: "/teacher" },
          { key: "library", label: "Library", path: "/library" },
          { key: "tests", label: "Tests", path: "/teacher-tests" },
          { key: "classes", label: "Classes", path: "/classes" },
          { key: "settings", label: "Teacher Settings", path: "/teacher-settings" }
        ]
      : [
          { key: "dashboard", label: "Dashboard", path: "/teacher" },
          { key: "library", label: "Library", path: "/library" },
          { key: "tests", label: "Tests", path: "/teacher-tests" },
          { key: "classes", label: "Classes", path: "/classes" },
          { key: "settings", label: "Settings", path: "/teacher-settings" }
        ];

  const sidebarTitle = sidebarIsStudent
    ? "Student"
    : sidebarIsAdmin
      ? "Admin"
      : "Wizdm.io";

  const activeKey = "${active}";

  const itemsHtml = sidebarItems.map(item => {
    const isActive = activeKey === item.key;

    return \`
      <div
        class="sidebar-nav-item"
        data-path="\${item.path}"
        style="
          padding:12px 12px;
          border-radius:10px;
          margin-bottom:12px;
          cursor:pointer;
          font-size:15px;
          \${isActive ? "background:#334155;font-weight:700;" : ""}
        "
        onmouseover="this.style.background='#334155'"
        onmouseout="this.style.background='\${isActive ? "#334155" : "transparent"}'"
      >
        \${item.label}
      </div>
    \`;
  }).join("");

  document.getElementById("sidebarContent").innerHTML = \`
    <div>
      <h2 style="
        margin:0 0 28px 0;
        text-align:center;
        font-size:24px;
      ">\${sidebarTitle}</h2>
      \${itemsHtml}
    </div>

    <div>
      <div
        id="sidebarLogoutButton"
        style="
          padding:12px 12px;
          border-radius:10px;
          cursor:pointer;
          color:#f87171;
          font-size:15px;
        "
        onmouseover="this.style.background='#7f1d1d';this.style.color='white'"
        onmouseout="this.style.background='transparent';this.style.color='#f87171'"
      >
        Logout
      </div>
    </div>
  \`;

  document.querySelectorAll(".sidebar-nav-item").forEach(item => {
    item.addEventListener("click", function(){
      go(this.dataset.path || "/");
    });
  });

  const logoutButton = document.getElementById("sidebarLogoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", function(){
      if(typeof window.logout === "function"){
        window.logout();
        return;
      }

      fetch("/logout", {
        method: "POST"
      }).finally(() => {
        localStorage.clear();
        window.location.replace("/");
      });
    });
  }
})();
</script>
`;

  return `
<div
  id="sidebarContent"
  style="
    width:150px;
    min-width:150px;
    max-width:150px;
    flex:0 0 150px;
    box-sizing:border-box;
    background:#1e293b;
    color:white;
    padding:20px 12px;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    height:100vh;
    overflow-y:auto;
    overflow-x:hidden;
  "
></div>
${sidebarScript}
`;
}

module.exports = sidebar;