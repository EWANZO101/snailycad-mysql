import type { User } from "@snailycad/types";
import { classNames } from "lib/classNames";
import Document, { Html, Head, Main, NextScript } from "next/document";
import { UI_THEME_INIT_SCRIPT } from "lib/ui-theme";

class CustomDocument extends Document {
  render() {
    const session = this.props.__NEXT_DATA__.props.pageProps?.session as User | null;
    const userSavedLocale = this.props.__NEXT_DATA__.props.pageProps?.userSavedLocale as
      | string
      | null;
    const userSavedIsDarkTheme = parseIsDarkTheme(
      this.props.__NEXT_DATA__.props.pageProps?.userSavedIsDarkTheme,
    );

    const darkMode = session?.isDarkTheme ?? userSavedIsDarkTheme ?? true;
    const lang = session?.locale || userSavedLocale || "en";

    return (
      <Html lang={lang} data-ui-theme="new">
        <Head>
          <meta charSet="UTF-8" />
          <link rel="shortcut icon" type="image/png" href="/favicon.png" />
          {}
          <script dangerouslySetInnerHTML={{ __html: UI_THEME_INIT_SCRIPT }} />
        </Head>

        <body className={classNames("antialiased", darkMode && "dark")}>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default CustomDocument;

function parseIsDarkTheme(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}
