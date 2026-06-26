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
        { key: "my-tests", label: "Dashboard", path: "/my-tests", icon: "ti-layout-dashboard" }
      ]
    : sidebarIsAdmin
      ? [
          { key: "admin-dashboard", label: "Admin Dashboard", path: "/admin-dashboard", icon: "ti-layout-dashboard" },
          { key: "admin-settings",  label: "Admin Settings",  path: "/admin-settings",  icon: "ti-settings" }
        ]
      : [
          { key: "dashboard", label: "Dashboard", path: "/teacher",         icon: "ti-layout-dashboard" },
          { key: "library",   label: "Library",   path: "/library",         icon: "ti-books" },
          { key: "tests",     label: "Tests",     path: "/teacher-tests",   icon: "ti-clipboard-list" },
          { key: "classes",   label: "Classes",   path: "/classes",         icon: "ti-users" },
          { key: "settings",  label: "Settings",  path: "/teacher-settings",icon: "ti-settings" }
        ];

  const activeKey = "${active}";

  const itemsHtml = sidebarItems.map(item => {
    const isActive = activeKey === item.key;
    return \`
      <div
        class="sidebar-nav-item"
        data-path="\${item.path}"
        style="
          padding:10px 14px;
          border-radius:10px;
          margin-bottom:4px;
          cursor:pointer;
          font-size:14px;
          font-weight:\${isActive ? "600" : "400"};
          display:flex;
          align-items:center;
          gap:10px;
          color:\${isActive ? "#e0633a" : "rgba(255,255,255,0.72)"};
          background:\${isActive ? "rgba(224,99,58,0.15)" : "transparent"};
          transition:background .15s,color .15s;
        "
        onmouseover="if(!this.dataset.active){this.style.background='rgba(255,255,255,0.07)';this.style.color='#fff'}"
        onmouseout="if(!this.dataset.active){this.style.background='transparent';this.style.color='rgba(255,255,255,0.72)'}"
        \${isActive ? 'data-active="1"' : ""}
      >
        <i class="ti \${item.icon}" style="font-size:17px;flex-shrink:0;"></i>
        \${item.label}
      </div>
    \`;
  }).join("");

  document.getElementById("sidebarContent").innerHTML = \`
    <div>
      <div style="
        font-family:'Fraunces',Georgia,serif;
        font-size:21px;
        font-weight:600;
        color:#fff;
        letter-spacing:-0.01em;
        display:flex;
        align-items:center;
        gap:8px;
        margin-bottom:32px;
        padding:0 4px;
      ">
        <span style="
          width:10px;
          height:10px;
          border-radius:3px;
          background:#e0633a;
          display:inline-block;
          flex-shrink:0;
        "></span>
        Wzdm.in
      </div>
      \${itemsHtml}
    </div>

    <div>
      <div
        id="sidebarLogoutButton"
        style="
          padding:10px 14px;
          border-radius:10px;
          cursor:pointer;
          color:rgba(248,113,113,0.85);
          font-size:14px;
          display:flex;
          align-items:center;
          gap:10px;
          transition:background .15s,color .15s;
        "
        onmouseover="this.style.background='rgba(127,29,29,0.4)';this.style.color='#fca5a5'"
        onmouseout="this.style.background='transparent';this.style.color='rgba(248,113,113,0.85)'"
      >
        <i class="ti ti-logout" style="font-size:17px;flex-shrink:0;"></i>
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
      fetch("/logout", { method: "POST" }).finally(() => {
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
    width:210px;
    min-width:210px;
    max-width:210px;
    flex:0 0 210px;
    box-sizing:border-box;
    background:#11161d;
    color:white;
    padding:24px 14px;
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
