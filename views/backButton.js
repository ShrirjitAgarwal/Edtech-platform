function backButton(fallbackPath = "/") {
  return `
<button onclick="goBack('${fallbackPath}')" style="
  padding:10px 14px;
  background:#f59e0b;
  color:white;
  border:none;
  border-radius:8px;
  cursor:pointer;
  font-weight:700;
">
  ← Previous Page
</button>
`;
}
module.exports = backButton;