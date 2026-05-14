function sidebar(active = "", role = "teacher") {
  const isStudent = role === "student";
  const items = isStudent
    ? [
        { key: "my-tests", label: "My Tests", path: "/my-tests" },
        { key: "dashboard", label: "Dashboard", path: "/my-tests" }
      ]
    : [
        { key: "dashboard", label: "Dashboard", path: "/teacher" },
        { key: "library", label: "Library", path: "/library" },
        { key: "tests", label: "Tests", path: "/teacher-tests" },
        { key: "classes", label: "Classes", path: "/classes" }
      ];
  return `
<div style="
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
">
  <div>
    <h2 style="
      margin:0 0 28px 0;
      text-align:center;
      font-size:24px;
    ">${isStudent ? "Student" : "Wizdm.io"}</h2>
    ${items.map(item => `
      <div
        onclick="go('${item.path}')"
        style="
          padding:12px 12px;
          border-radius:10px;
          margin-bottom:12px;
          cursor:pointer;
          font-size:15px;
          ${active === item.key ? "background:#334155;font-weight:700;" : ""}
        "
        onmouseover="this.style.background='#334155'"
        onmouseout="this.style.background='${active === item.key ? "#334155" : "transparent"}'"
      >
        ${item.label}
      </div>
    `).join("")}
  </div>
  <div>
    <div
      onclick="logout()"
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
</div>
`;
}
module.exports = sidebar;