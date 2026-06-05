import "./globals.css";
import TemplateShell from "@/components/TemplateShell";

export const metadata = {
  title: "Ecosistema USPG",
  description: "Plataforma modular integrada — USPG",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" dir="ltr">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="stylesheet" href="/assets/plugins/bootstrap/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/assets/css/style.min.css" />
      </head>
      <body className="font-muli theme-blush dark-mode" suppressHydrationWarning>
        <div id="main_content">
          <TemplateShell>
            {children}
          </TemplateShell>
        </div>
      </body>
    </html>
  );
}
