/**
 * Copy text to clipboard using document.execCommand
 * Works on both HTTP and HTTPS without requiring secure context
 *
 * @param text - The text to copy to clipboard
 * @returns Promise that resolves on success, rejects on failure
 */
export function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '-9999px'
    textarea.style.opacity = '0'
    textarea.setAttribute('readonly', '')

    // Add to DOM and select text
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, text.length)

    try {
      // Execute copy command
      const successful = document.execCommand('copy')
      if (successful) {
        resolve()
      } else {
        reject(new Error('Copy command failed'))
      }
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)))
    } finally {
      // Clean up: remove the temporary element
      document.body.removeChild(textarea)
    }
  })
}
