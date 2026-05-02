const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://asset-manager-fomv.onrender.com";

// guardamos fetch original
const originalFetch = window.fetch.bind(window);

// override global
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === "string" && input.startsWith("/api")) {
    input = API_URL + input;
  }

  return originalFetch(input, init);
};
