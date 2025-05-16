// Load environment variables from .env file (for local development)
require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded());
// const favicon = require('serve-favicon');
//* PORT
const PORT = process.env.PORT || 7070;

//* importing main routes
const main = require("./routers/main");
const courses = require("./routers/programs");
const coursesVn = require("./routers/programsVn");
const campVn = require("./routers/campVn");
const camp = require("./routers/camp");
const admissionsConsulting = require("./routers/admissions-consulting");
const admissionsConsultingVn = require("./routers/admissions-consulting-vn");

const blog = require("./routers/blog");
const blogVn = require("./routers/blog-vn");

// redirect HTTP to HTTPS
// app.all('*', (req, res, next) => {
//   // development not redirect
//   if (process.env.NODE_ENV == 'development') {
//     next();
//     return;
//   }

//   const protocol = req.protocol;
//   if (protocol == 'https') {
//     next();
//   } else {
//     res.redirect(301, `https://${req.hostname}${req.url}`);
//     return;
//   }
// });

app.set("view engine", "ejs");
app.set("views", "./src/views");
app.use(express.json());
app.use(express.static(__dirname + "/public"));

// * main routes
app.use("/", main);
// * courses & courses' sub routes
app.use("/programs", courses);
app.use("/vn/programs", coursesVn);
// * camp
app.use("/camp", camp);
app.use("/vn/camp", campVn);
// * admissions-consulting
app.use("/admissions-consulting", admissionsConsulting);

app.use("/vn/admissions-consulting", admissionsConsultingVn);

//blog

app.use("/blog", blog);
app.use("/vn/blog", blogVn);

app.use("/health-check", (req, res) => {
  res.send("success");
});

app.listen(PORT, () => {
  console.log(`Server is connected to ${PORT}`);
});

// Load nodemailer for sending emails via SMTP (replaces AWS SES)
const nodemailer = require("nodemailer");

// Create SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "your-email@gmail.com",
    pass: process.env.SMTP_PASSWORD || "your-app-password",
  },
});

app.post("/camp/summer-boarding-camp", function (req, res) {
  if (req.body.email) {
    const mailOptions = {
      from: process.env.SMTP_FROM || "contact@pointavenue.com",
      to: "contact@pointavenue.com",
      subject: "Register Summer Boarding Camp",
      html: `
        <p><b>First Name: </b> ${req.body.firstName}</p>
        <p><b>Last Name: </b> ${req.body.lastName}</p>
        <p><b>Email: </b> ${req.body.email}</p>
        <p><b>Child Name: </b> ${req.body.childName}</p>
        <p><b>Phone Number: </b> ${req.body.phoneNumber}</p>
        <p><b>Student's Grade & School: </b> ${req.body.grade}</p>
      `,
      text: `First Name: ${req.body.firstName}\nLast Name: ${req.body.lastName}\nEmail: ${req.body.email}\nChild Name: ${req.body.childName}\nPhone Number: ${req.body.phoneNumber}\nStudent's Grade & School: ${req.body.grade}`,
    };

    transporter
      .sendMail(mailOptions)
      .then(function (info) {
        res.status(204).send();
      })
      .catch(function (err) {
        console.error("SMTP error:", err);
        res.status(500).send(err);
      });
  }
});

app.post("/camp/summer-day-camp", function (req, res) {
  if (req.body.email) {
    const mailOptions = {
      from: process.env.SMTP_FROM || "contact@pointavenue.com",
      to: "contact@pointavenue.com",
      subject: "Register Summer Day Camp",
      html: `
        <p><b>First Name: </b> ${req.body.firstName}</p>
        <p><b>Last Name: </b> ${req.body.lastName}</p>
        <p><b>Email: </b> ${req.body.email}</p>
        <p><b>Child Name: </b> ${req.body.childName}</p>
        <p><b>Phone Number: </b> ${req.body.phoneNumber}</p>
        <p><b>Student's Grade & School: </b> ${req.body.grade}</p>
      `,
      text: `First Name: ${req.body.firstName}\nLast Name: ${req.body.lastName}\nEmail: ${req.body.email}\nChild Name: ${req.body.childName}\nPhone Number: ${req.body.phoneNumber}\nStudent's Grade & School: ${req.body.grade}`,
    };

    transporter
      .sendMail(mailOptions)
      .then(function (info) {
        res.status(204).send();
      })
      .catch(function (err) {
        console.error("SMTP error:", err);
        res.status(500).send(err);
      });
  }
});

app.post("/camp/winter-boarding-camp", function (req, res) {
  if (req.body.email) {
    const mailOptions = {
      from: process.env.SMTP_FROM || "contact@pointavenue.com",
      to: "contact@pointavenue.com",
      subject: "Register Winter Boarding Camp",
      html: `
        <p><b>First Name: </b> ${req.body.firstName}</p>
        <p><b>Last Name: </b> ${req.body.lastName}</p>
        <p><b>Email: </b> ${req.body.email}</p>
        <p><b>Child Name: </b> ${req.body.childName}</p>
        <p><b>Phone Number: </b> ${req.body.phoneNumber}</p>
        <p><b>Student's Grade & School: </b> ${req.body.grade}</p>
      `,
      text: `First Name: ${req.body.firstName}\nLast Name: ${req.body.lastName}\nEmail: ${req.body.email}\nChild Name: ${req.body.childName}\nPhone Number: ${req.body.phoneNumber}\nStudent's Grade & School: ${req.body.grade}`,
    };

    transporter
      .sendMail(mailOptions)
      .then(function (info) {
        res.status(204).send();
      })
      .catch(function (err) {
        console.error("SMTP error:", err);
        res.status(500).send(err);
      });
  }
});

app.post("/camp/grit-camp", function (req, res) {
  if (req.body.email) {
    const mailOptions = {
      from: process.env.SMTP_FROM || "contact@pointavenue.com",
      to: "contact@pointavenue.com",
      subject: "Register Grit Camp",
      html: `
        <p><b>First Name: </b> ${req.body.firstName}</p>
        <p><b>Last Name: </b> ${req.body.lastName}</p>
        <p><b>Email: </b> ${req.body.email}</p>
        <p><b>Child Name: </b> ${req.body.childName}</p>
        <p><b>Phone Number: </b> ${req.body.phoneNumber}</p>
        <p><b>Student's Grade & School: </b> ${req.body.grade}</p>
      `,
      text: `First Name: ${req.body.firstName}\nLast Name: ${req.body.lastName}\nEmail: ${req.body.email}\nChild Name: ${req.body.childName}\nPhone Number: ${req.body.phoneNumber}\nStudent's Grade & School: ${req.body.grade}`,
    };

    transporter
      .sendMail(mailOptions)
      .then(function (info) {
        res.status(204).send();
      })
      .catch(function (err) {
        console.error("SMTP error:", err);
        res.status(500).send(err);
      });
  }
});
