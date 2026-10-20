import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Scanner extends EventEmitter {
  #LARGEST_FILES_COUNT = 3;

  #totalSize = 0;
  #filesByExtension = {};
  #mtimeCounters = {
    last7Days: 0,
    last30Days: 0,
    olderThan90Days: 0,
  };
  #allFiles = [];

  #resetStats() {
    this.#totalSize = 0;
    this.#filesByExtension = {};
    this.#mtimeCounters = {
      last7Days: 0,
      last30Days: 0,
      olderThan90Days: 0,
    };
    this.#allFiles = [];
  }

  #groupByExtension(extension, stats) {
    if (!this.#filesByExtension[extension]) {
      this.#filesByExtension[extension] = {
        size: 0,
        count: 0,
      };
    }
    this.#filesByExtension[extension].size += stats.size;
    this.#filesByExtension[extension].count++;
  }

  #msToDays(ms) {
    return (Date.now() - ms.getTime()) / (1000 * 60 * 60 * 24);
  }

  #groupByMtime(stats) {
    const ageInDays = this.#msToDays(stats.mtime);

    if (ageInDays >= 0 && ageInDays <= 7) {
      this.#mtimeCounters.last7Days++;
    }
    if (ageInDays >= 0 && ageInDays <= 30) {
      this.#mtimeCounters.last30Days++;
    }
    if (ageInDays > 90) {
      this.#mtimeCounters.olderThan90Days++;
    }
  }

  async #processFile(file) {
    await sleep(100); // Simulate a small delay for demonstration purposes

    const filePath = path.join(file.parentPath, file.name);

    const stats = await fs.stat(filePath);
    this.#totalSize += stats.size;

    const extension = path.extname(file.name).toLowerCase() || '(other)';

    this.#groupByExtension(extension, stats);

    this.#groupByMtime(stats);

    this.#allFiles.push({
      name: file.name,
      size: stats.size,
      mtime: stats.mtime,
    });
  }

  async scan(directory) {
    this.emit('scan-start', { directory });

    this.#resetStats();

    const dirents = await fs.readdir(directory, {
      recursive: true,
      withFileTypes: true,
    });

    const files = dirents.filter(file => file.isFile());

    for (let i = 0; i < files.length; i++) {
      await this.#processFile(files[i]);

      this.emit('file-found', {
        currentFile: i + 1,
        totalFiles: files.length,
      });
    }

    const largestFiles = this.#allFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, this.#LARGEST_FILES_COUNT);

    let oldestFile =
      this.#allFiles.length > 0
        ? this.#allFiles.sort((a, b) => a.mtime - b.mtime)[0]
        : null;

    this.emit('scan-complete', {
      totalFiles: files.length,
      totalSize: this.#totalSize,
      filesByExtension: this.#filesByExtension,
      mtimeCounters: this.#mtimeCounters,
      largestFiles: largestFiles,
      oldestFile: oldestFile
        ? {
            ...oldestFile,
            ageInDays: this.#msToDays(oldestFile.mtime),
          }
        : null,
    });
  }
}

export default Scanner;
