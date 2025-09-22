// Browser-compatible util polyfill
// Provides minimal util functionality without Node.js dependencies

export function debuglog(section) {
  // Return a no-op function in browser environment
  // Node.js would check process.env.NODE_DEBUG, but we skip that in browser
  return function() {
    // Silent in production, could log in development if needed
    if (import.meta.env.DEV) {
      console.debug(`[${section}]`, ...arguments);
    }
  };
}

// Add other util functions as needed
export function format(f, ...args) {
  if (typeof f !== 'string') {
    return args.map(arg => String(arg)).join(' ');
  }

  let i = 0;
  return f.replace(/%[sdj%]/g, (x) => {
    if (i >= args.length) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      case '%%': return '%';
      default:
        return x;
    }
  });
}

// Export as default and named exports for compatibility
const util = { debuglog, format };
export default util;