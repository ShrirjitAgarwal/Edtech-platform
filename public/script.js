console.log("SCRIPT VERSION 4 LOADED");
function go(path){
  window.location.href = path;
}
function logout(){
  fetch("/logout", {
    method: "POST"
  }).finally(() => {
    localStorage.clear();
    window.location.href = "/";
  });
}