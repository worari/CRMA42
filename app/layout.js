import './globals.css';

export const metadata = {
  title: 'ทำเนียบรุ่นเตรียมทหาร',
  description: 'Military Alumni Directory System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
