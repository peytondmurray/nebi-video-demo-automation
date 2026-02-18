import type { Page, Locator } from "playwright";

// ── Fake cursor ──────────────────────────────────────────────────────────

async function ensureCursor(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (document.getElementById("nebi-demo-cursor")) return;
    const cursor = document.createElement("div");
    cursor.id = "nebi-demo-cursor";
    // SVG cursor pointer
    cursor.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
    Object.assign(cursor.style, {
      position: "fixed",
      top: "0px",
      left: "0px",
      width: "24px",
      height: "24px",
      zIndex: "999999",
      pointerEvents: "none",
      transition: "top 0.4s cubic-bezier(0.25, 0.1, 0.25, 1), left 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)",
      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
    });
    document.body.appendChild(cursor);
  });
}

async function moveCursorTo(page: Page, x: number, y: number): Promise<void> {
  await ensureCursor(page);
  await page.evaluate(({ x, y }) => {
    const cursor = document.getElementById("nebi-demo-cursor");
    if (cursor) {
      cursor.style.top = `${y}px`;
      cursor.style.left = `${x}px`;
    }
  }, { x, y });
  // Wait for the CSS transition
  await new Promise((r) => setTimeout(r, 450));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Type text character by character with a delay between keystrokes. */
export async function demoType(page: Page, locator: Locator, text: string, delayMs = 60): Promise<void> {
  await locator.clear();
  await locator.pressSequentially(text, { delay: delayMs });
}

/** Move the fake cursor to a locator's center, then click it. */
export async function demoClick(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  if (box) {
    await moveCursorTo(page, box.x + box.width / 2, box.y + box.height / 2);
  }
  await locator.click();
}

/** Move the fake cursor to a locator (without clicking). */
export async function demoHover(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  if (box) {
    await moveCursorTo(page, box.x + box.width / 2, box.y + box.height / 2);
  }
}

/** Hide the cursor (e.g. before final overlay). */
export async function hideCursor(page: Page): Promise<void> {
  await page.evaluate(() => {
    const cursor = document.getElementById("nebi-demo-cursor");
    if (cursor) cursor.style.display = "none";
  });
}

export async function showAnnotation(page: Page, text: string): Promise<void> {
  await page.evaluate((t: string) => {
    // Inject Fira Sans font if not already loaded
    if (!document.getElementById("nebi-fira-sans-font")) {
      const link = document.createElement("link");
      link.id = "nebi-fira-sans-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;700&display=swap";
      document.head.appendChild(link);
    }

    // Remove existing annotation if any
    const existing = document.getElementById("nebi-demo-annotation");
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.id = "nebi-demo-annotation";
    el.textContent = t;
    Object.assign(el.style, {
      position: "fixed",
      bottom: "32px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(15, 15, 15, 0.88)",
      color: "#fff",
      padding: "14px 40px",
      borderRadius: "999px",
      fontSize: "28px",
      fontFamily: '"Fira Sans", sans-serif',
      fontWeight: "500",
      letterSpacing: "0.01em",
      zIndex: "99999",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 0.4s ease",
      boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
    });
    document.body.appendChild(el);
    // Trigger fade-in
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });
  }, text);
}

export async function hideAnnotation(page: Page): Promise<void> {
  await page.evaluate(() => {
    const el = document.getElementById("nebi-demo-annotation");
    if (el) {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 400);
    }
  });
}

export async function showFinalOverlay(page: Page, logoDataUri: string): Promise<void> {
  await page.evaluate((logoSrc: string) => {
    // Remove annotation
    const ann = document.getElementById("nebi-demo-annotation");
    if (ann) ann.remove();

    // Solid black background — appears instantly, no opacity transition
    const overlay = document.createElement("div");
    overlay.id = "nebi-demo-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#000",
      zIndex: "99999",
      margin: "0",
      padding: "0",
    });

    // Inner content fades in on top of the solid black
    const content = document.createElement("div");
    Object.assign(content.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      opacity: "0",
      transition: "opacity 0.6s ease",
    });

    const logo = document.createElement("img");
    logo.src = logoSrc;
    logo.alt = "Nebi";
    Object.assign(logo.style, {
      width: "280px",
      height: "280px",
      marginBottom: "32px",
      objectFit: "contain",
    });

    const title = document.createElement("div");
    title.textContent = "Nebi";
    Object.assign(title.style, {
      fontSize: "72px",
      fontWeight: "700",
      color: "#fff",
      fontFamily: '"Fira Sans", sans-serif',
      letterSpacing: "-0.02em",
    });

    const subtitle = document.createElement("div");
    subtitle.textContent = "Multi-user environment management";
    Object.assign(subtitle.style, {
      fontSize: "38px",
      fontWeight: "400",
      color: "rgba(255,255,255,0.7)",
      marginTop: "16px",
      fontFamily: '"Fira Sans", sans-serif',
    });

    content.appendChild(logo);
    content.appendChild(title);
    content.appendChild(subtitle);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      content.style.opacity = "1";
    });
  }, logoDataUri);
}
