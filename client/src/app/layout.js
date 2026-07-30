import './globals.css';

export const metadata = {
  title: 'Sync Board | Rᴀᴠɪ Gᴏꜱᴡᴀᴍɪ',
  description:
    'Draw together in real-time. Create or join a room and collaborate instantly — no login required.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
