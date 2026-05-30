console.log("SCRIPT VERSION 4 LOADED");

function go(path){
  window.location.href = path;
}

function logout(){
  localStorage.clear();
  window.location.href = "/";
}