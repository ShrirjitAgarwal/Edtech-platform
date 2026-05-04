exports.registerTeacher = (req, res) => {
  const {
    readJSON,
    writeJSON
  } = require("../utils/file");
  const teachers =
    readJSON(
      "data/teachers.json"
    );
  const { id, password } =
    req.body;
  if (!id || !password) {
    return res.json({
      error:
        "Missing fields"
    });
  }
  const exists =
    teachers.find(
      (t) => t.id === id
    );
  if (exists) {
    return res.json({
      error:
        "Teacher already exists"
    });
  }
  teachers.push({
    id,
    password
  });
  writeJSON(
    "data/teachers.json",
    teachers
  );
  res.json({
    status: "registered"
  });
};