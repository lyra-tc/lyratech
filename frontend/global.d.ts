// Use type safe message keys with `next-intl`
type EsMessages = typeof import("./src/messages/es.json");
type FrMessages = typeof import("./src/messages/fr.json");
type DeMessages = typeof import("./src/messages/de.json");
type Messages = typeof import("./src/messages/en.json");
declare interface IntlMessages extends Messages, EsMessages, FrMessages, DeMessages{}