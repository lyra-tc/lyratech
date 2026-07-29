// Use type safe message keys with `next-intl`
type EsMessages = typeof import("./src/messages/es.json");
type FrMessages = typeof import("./src/messages/fr.json");
type DeMessages = typeof import("./src/messages/de.json");
type Messages = typeof import("./src/messages/en.json");
declare interface IntlMessages extends Messages, EsMessages, FrMessages, DeMessages{}

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare interface Window {
  turnstile?: TurnstileApi;
}