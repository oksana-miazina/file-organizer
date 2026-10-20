import Scanner from './lib/scanner.js';

async function scanDir(dir) {
  const scanner = new Scanner();

  scanner.on('scan-start', data => {
    console.log(`📂 Scanning: ${data.directory}`);
  });

  scanner.on('file-found', data => {
    process.stdout.write(
      `\rProcessing... ${drawProgressBar(data.currentFile, data.totalFiles)} files`
    );
  });

  scanner.on('scan-complete', data => {
    console.log(`\n\n📊 Scan Results:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Total files: ${data.totalFiles}`);
    console.log(`Total size: ${formatSize(data.totalSize)}`);

    if (!data.totalFiles) {
      return;
    }

    console.log(`\nBy File Type:`);

    console.log(
      Object.entries(data.filesByExtension)
        .sort(([extA, extB]) => {
          if (extA === '(other)') {
            return extB === '(other)' ? 0 : 1;
          }
          if (extB === '(other)') {
            return -1;
          }
          return extA.localeCompare(extB);
        })
        .map(
          ([ext, stats]) =>
            `${ext}\t${stats.count} files\t\t${formatSize(stats.size)}`
        )
        .join('\n')
    );

    console.log(`\nFile Age:`);
    console.log(`Last 7 days:\t\t${data.mtimeCounters.last7Days} files`);
    console.log(`Last 30 days:\t\t${data.mtimeCounters.last30Days} files`);
    console.log(
      `Older than 90:\t\t${data.mtimeCounters.olderThan90Days} files`
    );

    const colWidth = Math.max(
      ...data.largestFiles.map(file => file.name.length)
    );

    console.log(`\nLargest files:`);
    console.log(
      data.largestFiles
        .map(
          (file, i) =>
            `${i + 1}. ${file.name.padEnd(colWidth)}\t${formatSize(file.size)}`
        )
        .join('\n')
    );

    console.log(
      `\nOldest file: ${data.oldestFile.name} (modified ${Math.floor(data.oldestFile.ageInDays)} days ago)`
    );
  });

  await scanner.scan(dir);
}

async function main() {
  const command = process.argv[2];
  const targetDir = process.argv[3];

  if (!command || !targetDir) {
    console.error('Usage: node file-organizer.js <command> <directory>');
    process.exit(1);
  }

  switch (command) {
    case 'scan':
      await scanDir(targetDir);
      break;
    default:
      console.error(
        'Invalid command. Use: scan'
        // 'Invalid command. Use: scan, duplicates, organize, or cleanup'
      );
      process.exit(1);
  }
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

function drawProgressBar(current, total, width = 20) {
  const percentage = current / total;
  const filled = Math.round(percentage * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `${bar} ${current}/${total}`;
}

main();
