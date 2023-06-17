const dayjs = require('dayjs');
const { readdirSync, statSync } = require('fs');


/**
 * Convert bytes to human readable format
 * 
 * @param {number} bytes Bytes to convert
 */
function humanFileSize(bytes) {
    const thresh = 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}

/**
 * @typedef BrowserFile
 * 
 * @property {string} name File name
 * @property {string} path Relative path to the file
 * @property {boolean} isDirectory Is file a directory
 * @property {number} size File size in bytes
 * @property {Date} created Date of file creation
 * @property {Date} modified Date of file modification
 */

/**
 * Return array of {@link BrowserFile} with relative path from the directory, created & modified dates along with file size
 * 
 * @param {string} path Path to the directory for listing files
 * 
 * @returns {BrowserFile[]} Array of {@link BrowserFile}
 */
function listFiles(path) {
    /**
     * @type {BrowserFile[]}
     * 
     * List of files in the directory
     */
    const files = [];

    try {
        // List files & directories in `path`
        const dir = readdirSync(path, { withFileTypes: true });

        for (const dirent of dir) {
            const isDirectory = dirent.isDirectory()
            const file = {
                name: dirent.name,
                path: path + '/' + dirent.name,
                isDirectory,
                size: 0,
                created: null,
                modified: null
            };

            try {
                // Get file stats
                const stats = statSync(file.path);
                file.size = isDirectory ? "" : humanFileSize(stats.size);
                file.created = dayjs(stats.birthtime).format('YYYY-MM-DD HH:mm:ss');
                file.modified = dayjs(stats.mtime).format('YYYY-MM-DD HH:mm:ss');
            } catch (err) {
                console.error("Failed to get file stats", err);
            }

            files.push(file);
        }
    } catch (err) {
        console.error("Failed to get files", err);
    }

    return files.sort((a, b) => b.isDirectory - a.isDirectory);
}

module.exports = {
    listFiles
}