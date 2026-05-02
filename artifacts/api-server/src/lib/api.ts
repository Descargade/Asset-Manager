const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://asset-manager-fomv.onrender.com";

// guardamos fetch original
const originalFetch = window.fetch.bind(window);

// override global TOTAL
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let url = input;

  if (typeof input === "string") {
    if (input.startsWith("/api")) {
      url = API_URL + input;
    }
  } else if (input instanceof Request) {
    if (input.url.includes("/api")) {
      url = input.url.replace(window.location.origin, API_URL);
    }
  }

  return originalFetch(url as any, init);
};

// 🔥 DEBUG (para ver si funciona)
console.log("API interceptor activo:", API_URL);
