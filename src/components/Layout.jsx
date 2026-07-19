import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, admin, onLogout }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <Sidebar onLogout={onLogout} />
      <div className="lg:pl-72">
        <Header admin={admin} />
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
