import "./globals.css";

export const metadata = {
  title: "ExpenseAI - Smart Expense Tracker",
  description: "AI-powered expense tracking with natural language chatbot, analytics, and budget management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
