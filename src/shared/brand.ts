import brandConfig from '../../brand.config.json';

/** Change name & tagline in brand.config.json at project root (one file). */
export const APP_NAME = brandConfig.appName;
export const APP_TAGLINE = brandConfig.tagline;

/** Put your logo in public/brand/logo.png (PNG, square, ~256–512 px). */
export const APP_LOGO_SRC = `/brand/${brandConfig.logoFile}`;

/** Windows .exe icon: public/brand/icon.ico (optional; rebuild with pack:win). */
export const APP_ICON_FILE = brandConfig.iconFile;

export const DRAW_BALL_COUNT = 75;
/** Cards created on first install (existing deck). Add more manually up to cartellaCount. */
export const INITIAL_CARTELLA_COUNT = brandConfig.initialCartellaCount ?? 150;
/** Maximum cartella numbers an agent can create manually */
export const CARTELLA_COUNT = brandConfig.cartellaCount ?? 300;
