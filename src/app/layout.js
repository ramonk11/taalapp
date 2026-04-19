import "./globals.css";

export const metadata = {
  title: "LinguaFlow — Leer een taal door te praten",
  description: "AI-powered taaltutor die zich aanpast aan jouw niveau",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
