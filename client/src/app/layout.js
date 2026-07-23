import './globals.css';

export const metadata = {
  title: 'Real-Time Collaborative Whiteboard',
  description:
    'Draw together in real-time. Create or join a room and collaborate instantly — no login required.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
