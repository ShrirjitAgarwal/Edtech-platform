function sidebar(active = "") {
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
    ">Wizdm.io</h2>
    <div
      onclick="go('/teacher')"
      style="
        padding:12px 12px;
        border-radius:10px;
        margin-bottom:12px;
        cursor:pointer;
        font-size:15px;
        ${active === "dashboard" ? "background:#334155;font-weight:700;" : ""}
      "
      onmouseover="this.style.background='#334155'"
      onmouseout="this.style.background='${active === "dashboard" ? "#334155" : "transparent"}'"
    >
      Dashboard
    </div>
    <div
      onclick="go('/library')"
      style="
        padding:12px 12px;
        border-radius:10px;
        margin-bottom:12px;
        cursor:pointer;
        font-size:15px;
        ${active === "library" ? "background:#334155;font-weight:700;" : ""}
      "
      onmouseover="this.style.background='#334155'"
      onmouseout="this.style.background='${active === "library" ? "#334155" : "transparent"}'"
    >
      Library
    </div>
    <div
      onclick="go('/teacher-tests')"
      style="
        padding:12px 12px;
        border-radius:10px;
        margin-bottom:12px;
        cursor:pointer;
        font-size:15px;
        ${active === "tests" ? "background:#334155;font-weight:700;" : ""}
      "
      onmouseover="this.style.background='#334155'"
      onmouseout="this.style.background='${active === "tests" ? "#334155" : "transparent"}'"
    >
      Tests
    </div>
    <div
      onclick="go('/classes')"
      style="
        padding:12px 12px;
        border-radius:10px;
        margin-bottom:12px;
        cursor:pointer;
        font-size:15px;
        ${active === "classes" ? "background:#334155;font-weight:700;" : ""}
      "
      onmouseover="this.style.background='#334155'"
      onmouseout="this.style.background='${active === "classes" ? "#334155" : "transparent"}'"
    >
      Classes
    </div>
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