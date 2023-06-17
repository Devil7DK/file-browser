#! /usr/bin/env node

const express = require("express");
const basicAuth = require("express-basic-auth");
const { engine } = require("express-handlebars");
const { join, basename, resolve } = require("path");
const multer = require("multer");

const {
    renderFileListHandler,
    downloadFileHandler,
    deleteHandler,
    newFolderHandler,
    zipFileHandler,
} = require("./handlers");

const { Command } = require("commander");

const program = new Command();

const package = require("../package.json");

program
    .name("file-browser")
    .description("Simple server to browse files & directories remotely")
    .version(package.version);

program
    .argument(
        "[path]",
        "Directory to serve. Defaults to current working directory",
        process.env.BROWSING_DIR || process.cwd()
    )
    .option("--username <username>", "Username for basic authentication")
    .option("--password <password>", "Password for basic authentication")
    .option("-p, --port <port>", "Port to listen on", 3000);

program.parse();

const opts = program.opts();

const browsingDir = resolve(program.args[0] || process.env.BROWSING_DIR || process.cwd());
const port = opts.port || process.env.PORT || 3000;
const username = opts.username || process.env.USERNAME;
const password = opts.password || process.env.PASSWORD;

console.log(`Serving ${browsingDir}`);

const deleteFileOrDir = deleteHandler(browsingDir);
const downloadFile = downloadFileHandler(browsingDir);
const newFolder = newFolderHandler(browsingDir);
const renderFileList = renderFileListHandler(browsingDir);
const zipFile = zipFileHandler(browsingDir);

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, join(browsingDir, req.path));
        },
        filename: (req, file, cb) => {
            cb(null, basename(file.originalname));
        },
    }),
});

const app = express();

app.use(express.json());

app.engine(
    "hbs",
    engine({
        defaultLayout: "main",
        extname: ".hbs",
        layoutsDir: __dirname + "/views/layouts",
        helpers: {
            if: function (conditional, options) {
                if (conditional) {
                    return options.fn(this);
                } else {
                    return options.inverse(this);
                }
            },
        },
    })
);

app.set("view engine", "hbs");

app.set("views", join(__dirname, "./views"));

if (username && password) {
    console.log(`Using basic authentication`);
    app.use(
        basicAuth({
            users: {
                [username]: password,
            },
            challenge: true,
        })
    );
}

app.post("/*", upload.array("file"), renderFileList);

app.put("/*", newFolder);

app.delete("/*", deleteFileOrDir);

app.use(express.static(join(__dirname, "..", "public")));

app.get("/*", downloadFile, zipFile, renderFileList);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
