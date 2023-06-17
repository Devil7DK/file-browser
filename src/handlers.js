const { existsSync, mkdirSync, rmSync, rmdirSync, statSync } = require("fs");
const archiver = require("archiver");
const { join, relative, resolve } = require("path");

const { listFiles } = require("./utils");

/**
 * Return a middleware function to delete file or directory if exists
 * 
 * @param {string} browsingDir The top level directory to browse
 * @returns {import("express").RequestHandler"}
 */
function deleteHandler(browsingDir) {
    return function (req, res, next) {
        const pathsToDelete = req.body;

        if (!Array.isArray(pathsToDelete)) {
            return next();
        }

        for (const pathToDelete of pathsToDelete) {
            const path = join(browsingDir, pathToDelete);

            if (!existsSync(path)) {
                return res.status(404).send(`File or directory ${pathToDelete} does not exist`);
            }
        }

        for (const pathToDelete of pathsToDelete) {
            const path = join(browsingDir, pathToDelete);

            if (statSync(path).isDirectory()) {
                rmdirSync(path, { recursive: true });
            } else {
                rmSync(path);
            }
        }

        return res.status(200).end();
    }
}

/**
 * Return a middleware function to download file from the directory if exists and not a directory
 * 
 * @param {string} browsingDir The top level directory to browse
 * @returns {import("express").RequestHandler"}
 */
function downloadFileHandler(browsingDir) {
    return function (req, res, next) {
        const pathToDownload = join(browsingDir, req.path);

        if (!existsSync(pathToDownload)) {
            return next();
        }

        if (statSync(pathToDownload).isDirectory()) {
            return next();
        }

        return res.download(pathToDownload);
    }
}

/**
 * Return a middleware function to create new directory if not exists
 * 
 * @param {string} browsingDir The top level directory to browse
 * @returns {import("express").RequestHandler"}
 */
function newFolderHandler(browsingDir) {
    return function (req, res, next) {
        const pathToCreate = join(browsingDir, req.path);

        if (existsSync(pathToCreate)) {
            return res.status(409).send(`File or directory ${req.path} already exists`);
        }

        mkdirSync(pathToCreate);

        return res.status(200).end();
    }
}

/**
 * Return a middleware function to render file list from the directory
 * 
 * @param {string} browsingDir The top level directory to browse
 * @returns {import("express").RequestHandler"}
 */
function renderFileListHandler(browsingDir) {
    return function (req, res, next) {
        const pathToBrowse = join(browsingDir, req.path);

        if (!existsSync(pathToBrowse)) {
            return next();
        }


        // Get full URL from req including host
        const parent = "/" + relative(browsingDir, resolve(pathToBrowse, ".."));

        const files = listFiles(pathToBrowse);

        return res.render('browser', { parent, path: req.path.replaceAll(/\/+$/g, "") === "" ? null : req.path, files });
    }
}

/**
 * Return a middleware function to zip selected files & directories using archiver and stream it to the client
 * 
 * @param {string} browsingDir The top level directory to browse
 * @returns {import("express").RequestHandler"}
 */
function zipFileHandler(browsingDir) {
    return function (req, res, next) {
        const isZip = req.query.zip;
        const files = req.query.files;

        if (!isZip || !files) {
            return next();
        }

        let pathsToZip = [];

        try {
            pathsToZip = JSON.parse(files);
        } catch (e) {
            return res.status(400).send("Invalid files parameter");
        }

        if (!Array.isArray(pathsToZip) || pathsToZip.length === 0) {
            return res.status(400).send("Invalid files parameter");
        }

        for (const pathToZip of pathsToZip) {
            const path = join(browsingDir, pathToZip);

            if (!existsSync(path)) {
                return res.status(404).send(`File or directory ${pathToZip} does not exist`);
            }
        }

        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        archive.on('warning', function (err) {
            console.warn("Warning while zipping files", err)
        });

        archive.on('error', function (err) {
            console.error("Failed to zip files", err);
        });

        archive.on("close", () => res.end());

        archive.pipe(res);

        for (const pathToZip of pathsToZip) {
            const path = join(browsingDir, pathToZip);

            if (statSync(path).isDirectory()) {
                archive.directory(path, pathToZip.replace(/^\//, ""));
            } else {
                archive.file(path, { name: pathToZip.replace(/^\//, "") });
            }
        }

        res.set("Content-Type", "application/zip");
        res.set("Content-Disposition", `attachment; filename="${req.path.replaceAll(/\/+$/g, "") || "files"}.zip"`);
        res.set("Content-Transfer-Encoding", "binary");

        archive.finalize();
    }
}

module.exports = {
    deleteHandler,
    downloadFileHandler,
    newFolderHandler,
    renderFileListHandler,
    zipFileHandler,
}