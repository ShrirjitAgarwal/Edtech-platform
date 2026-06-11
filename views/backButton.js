function backButton(fallbackPath = "/") {
  const safeFallbackPath = String(fallbackPath || "/");

  return `
<button
  class="back-button"
  data-fallback-path="${safeFallbackPath.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}"
  style="
    padding:10px 14px;
    background:#f59e0b;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
    font-weight:700;
  "
>
  ← Previous Page
</button>
<script>
(function(){
  document.querySelectorAll(".back-button").forEach(button => {
    button.addEventListener("click", function(){
      goBack(this.dataset.fallbackPath || "/");
    });
  });
})();
</script>
`;
}

module.exports = backButton;