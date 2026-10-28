export default function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = -1;

  do {
    size /= 1024;
    unitIndex += 1;
  } while (size >= 1024 && unitIndex < units.length - 1);

  const formattedSize = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(size);

  return `${formattedSize} ${units[unitIndex]}`;
}