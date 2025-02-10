import './global.css';
import Navbar from '../public/src/widgets/navbar/Navbar';
import Footer from '../public/src/widgets/Footer';


export const metadata = {
  title: 'Molly',
  description: 'Generated by Next.js',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">

      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white">
                <Navbar />
          <main className="container mx-auto">{children}</main>
                <Footer />
      </body>

    </html>
  );
}
