async function loadPartial(selector, url) {
  const container = document.querySelector(selector);
  if (!container) return;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load ${url}`);
    container.innerHTML = await response.text();
  } catch (error) {
    console.error(error);
  }
}

async function initSite() {
  await Promise.all([
    loadPartial('#site-header', 'header.html'),
    loadPartial('#site-footer', 'footer.html')
  ]);

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');

  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
}

initSite();
