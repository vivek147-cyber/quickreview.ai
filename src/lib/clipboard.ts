/**
 * Robust clipboard write that works on iOS Safari, HTTPS, and HTTP fallback.
 * Returns true if successful.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern async clipboard API (HTTPS only, works on Android/Desktop)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand
    }
  }

  // Fallback: execCommand (deprecated but works on iOS Safari and HTTP)
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    // iOS requires setSelectionRange
    textarea.setSelectionRange(0, text.length);
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
