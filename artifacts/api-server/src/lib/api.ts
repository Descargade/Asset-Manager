const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://asset-manager-fomv.onrender.com";

// parche global para fetch
const originalFetch = window.fetch;

window.fetch = (input, init) => {
  if (typeof input === "string" && input.startsWith("/api")) {
    input = API_URL + input;
  }
  return originalFetch(input, init);
};
