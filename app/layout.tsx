import './global.css';
import Navbar from '../public/src/widgets/navbar/Navbar';
import Footer from '../public/src/widgets/Footer';


export const metadata = {
  title: 'Molly',
  description: 'Fashion E-Commerce',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white">
        <Navbar />
        <main className="container mx-auto">{children}</main>
        <Footer />
      </body>

    </html>
  );
}
