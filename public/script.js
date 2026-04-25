console.log("SCRIPT VERSION 3 LOADED");
function go(path){
  window.location.href = path;
}

function logout(){
  localStorage.removeItem("role");
  window.location.href = "/";
}

function runCode(id){
  const code = document.getElementById("code-" + id).value;
  const output = document.getElementById("output-" + id);

  try {
    output.innerText = "Running...\n";

    eval(code);

    if(typeof add !== "function"){
      output.innerText = "Error: Function 'add' not found";
      return;
    }

    const result = add(2,3);

    output.innerText = "Running...\nOutput: " + result;

  } catch(err){
    output.innerText = "Error: " + err.message;
  }
}