import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, admin, crm, onChangeCrm, onLogout }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <Sidebar crm={crm} onChangeCrm={onChangeCrm} onLogout={onLogout} />
      <div className="lg:pl-72">
        <Header admin={admin} crm={crm} onChangeCrm={onChangeCrm} />
        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
