const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bp = require("body-parser");
const fs = require("fs");

const app = express();
const port = 9000;

var credentials = JSON.parse(
  fs.readFileSync("./credentials.json").toString("utf-8")
);
const connection = mysql.createConnection({
  host: credentials.address,
  user: credentials.user,
  password: credentials.passwd,
  multipleStatements: true,
});
const apiDoc = {
  status: 200,
  msg: "API is working correctly",
  data: {
    doc: [
      {
        url: "/api/doc",
        note: "Helper for guidance in API usage",
      },
      {
        url: "/api/query/:db/:tab/:col?",
        note: "When not present, column (:col) defaults to *",
      },
      {
        url: "/api/modify/:db/:tab/",
        note: "Append new records to the table defined by /:tab/ in database specified in /:db/",
      },
    ],
  },
};
function formatToSQLRecordString(cols) {
  var values = "";
  cols.forEach((val) => {
    var pushTo = val;
    if (isNaN(parseFloat(val))) {
      pushTo = `"${val}"`;
    }
    values += `${pushTo},`;
  });
  values = values.slice(0, -1);
  return values;
}
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));
app.use(cors());
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/public/index.html`);
});
app.get("/api/doc", (req, res) => {
  res.send(apiDoc);
  console.log(
    `[${new Date().toISOString()}] API GET Query processed
    with IP ${req.ip}
    with URL /api/doc/
    `
  );
});
app.get("/api/query", (req, res) => {
  if (req.query.table === undefined) {
    res.sendStatus(400);
    return;
  }
  var col = req.query.col ? req.query.col : "*";
  var sql = `USE supermarket; SELECT ${col} FROM ${req.query.table}`;
  connection.query(sql, (err, resp) => {
    if (err) {
      var msg = `SQL query terminated with Errno ${err.errno}: ${err.code} // ${err.message}`;
      res.send({ data: msg });
      return;
    }
    var headers = resp[0];
    var jsonRes = resp[1];
    res.send({
      status: 200,
      statusMsg: "OK",
      time: new Date().toUTCString(),
      data: jsonRes,
    });
  });
  console.log(
    `[${new Date().toISOString()}] API GET Query processed
    with IP ${req.ip}
    with URL /api/query?db=${req.query.db}&table=${req.query.table}&col=${col}
    with SQL ${sql}
    `
  );
});
app.post("/api/modify", (req, res) => {
  if ((req.query.db === undefined) | (req.query.table === undefined)) {
    res.sendStatus(400);
    return;
  }
  // Modify table to append new record
  var cols = req.body.recordColumns;
  var values = formatToSQLRecordString(cols);
  var sql = `USE ${req.query.db}; INSERT INTO ${req.query.table} VALUES (${values})`;
  connection.query(sql, (err, resp) => {
    if (err) {
      var msg = `SQL query terminated with Errno ${err.errno}: ${err.code} // ${err.message}`;
      res.send({ data: msg });
      return;
    }
    res.send(resp);
  });
  console.log(
    `[${new Date().toISOString()}] API POST Query processed
    with IP ${req.ip}
    with URL /api/modify/?db=${req.query.db}&table=${req.query.table}
    with SQL ${sql}
    `
  );
});
app.post("/api/delete", (req, res) => {
  // if (
  //   !req.query.db |
  //   !req.query.table |
  //   !req.query.id |
  //   !req.body.credentials
  // ) {
  //   res.sendStatus(400);
  //   return;
  // }
  if (req.query.credentials !== credentials.passwd) {
    console.log(credentials.passwd);
    console.log(req.query.credentials);
    res.sendStatus(403);
    return;
  }
  let sql = `USE ${req.query.db}; DELETE FROM ${req.query.table} WHERE ID=${req.query.id}`;
  connection.query(sql, (err, resp) => {
    if (err) {
      var msg = `SQL query terminated with Errno ${err.errno}: ${err.code} // ${err.message}`;
      res.send({ data: msg });
      return;
    }
    res.send(resp);
  });
  console.log(
    `[${new Date().toISOString()}] API POST Query processed
    with IP ${req.ip}
    with URL /api/delete/?db=${req.query.db}&table=${req.query.table}&id=${
      req.query.id
    }
    with SQL ${sql}
    `
  );
});
