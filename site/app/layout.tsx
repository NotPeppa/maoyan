import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '票候 · 猫眼演出余票监控',
  description: '监控猫眼演出项目的购票按钮状态。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
