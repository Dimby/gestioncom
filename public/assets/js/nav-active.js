document.addEventListener("DOMContentLoaded", () => {
  const current = window.location.pathname.replace(/\/$/, "");
  document.querySelectorAll("nav a").forEach(link => {
    const href = link.getAttribute("href").replace(/\/$/, "");
    if (current === href) {
      link.classList.add("active");
    }
  });
});