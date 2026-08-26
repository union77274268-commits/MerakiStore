# Meraki PWA files

Put these files/folders beside your existing index.html on GitHub:

meraki/
├── index.html                 # your existing Claude HTML
├── manifest.json
├── sw.js
└── icons/
    ├── icon-192.png
    └── icon-512.png

IMPORTANT: add the following inside the <head> of index.html:

<link rel="manifest" href="./manifest.json">
<meta name="theme-color" content="#6a2cbe">
<link rel="apple-touch-icon" href="./icons/icon-192.png">

And add this just before </body>:

<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("Meraki PWA service worker registered"))
      .catch((err) => console.error("PWA service worker registration failed:", err));
  });
}
</script>

The included icons are temporary Meraki-style app icons. They can be replaced later with your final logo/icon without changing the PWA structure.
