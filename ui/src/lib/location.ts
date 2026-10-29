const BASE = location.href;

/** A config path (e.g. a logo file) as a full URL, relative to the page. */
export const abs = (u: string) => {
  try {
    return new URL(u, BASE).href;
  } catch {
    return u;
  }
};
