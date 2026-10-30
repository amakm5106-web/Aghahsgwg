import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AzLottery',
  description: 'AzLottery အွန်လိုင်းဂိမ်းဝန်ဆောင်မှု',
  openGraph: {
    title: 'AzLottery',
    description: 'AzLottery အွန်လိုင်းဂိမ်းဝန်ဆောင်မှု',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AzLottery',
    description: 'AzLottery အွန်လိုင်းဂိမ်းဝန်ဆောင်မှု',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="my">
      <body className="bg-[#fbf7ef] text-[#1e2637] min-h-screen antialiased selection:bg-blue-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
