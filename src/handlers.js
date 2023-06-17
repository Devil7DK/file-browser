const { join, relative, resolve } = require("path");

const { listFiles } = require("./utils");
const { existsSync, rmSync, rmdirSync, statSync, mkdirSync } = require("fs");

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

module.exports = {
    deleteHandler,
    downloadFileHandler,
    newFolderHandler,
    renderFileListHandler
}