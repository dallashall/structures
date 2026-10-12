/**
 * Text file save and open through the browser
 *
 * Save uses the File System Access picker where the browser has it (Chromium), so the user
 * picks the folder and name. Other browsers download the file to their download folder.
 * Open uses a hidden file input, which every browser supports.
 */

interface SaveFilePickerOptions {
  suggestedName: string;
  types: Array<{ description: string; accept: Record<string, string[]> }>;
}

interface WritableFile {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface SaveFileHandle {
  createWritable(): Promise<WritableFile>;
}

type ShowSaveFilePicker = (options: SaveFilePickerOptions) => Promise<SaveFileHandle>;

interface TextFileType {
  description: string;
  mimeType: string;
  extension: string;
}

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

const downloadBlob = (fileName: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // The download reads the URL after click() returns, so the revoke waits a task
  setTimeout(URL.revokeObjectURL, 0, url);
};

/**
 * Returns false when the user cancels the save picker
 */
export async function saveTextFile(fileName: string, text: string, fileType: TextFileType): Promise<boolean> {
  const blob = new Blob([text], { type: fileType.mimeType });
  const showSaveFilePicker = (window as { showSaveFilePicker?: ShowSaveFilePicker }).showSaveFilePicker;

  if (!showSaveFilePicker) {
    downloadBlob(fileName, blob);
    return true;
  }

  try {
    const handle = await showSaveFilePicker({
      suggestedName: fileName,
      types: [{ description: fileType.description, accept: { [fileType.mimeType]: [fileType.extension] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (error) {
    if (isAbortError(error)) return false;
    throw error;
  }
}

/**
 * Resolves to the chosen file's text, or null when the user cancels the picker
 */
export function openTextFile(accept: string): Promise<string | null> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;

  const pickFile = (resolve: (text: string | null) => void, reject: (error: unknown) => void): void => {
    const handleChange = (): void => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then(resolve, reject);
    };
    const handleCancel = (): void => resolve(null);
    input.addEventListener('change', handleChange, { once: true });
    input.addEventListener('cancel', handleCancel, { once: true });
    input.click();
  };

  return new Promise(pickFile);
}
