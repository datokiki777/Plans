import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./AppShell.css";

const PRIMARY_NAV = [
  { to: "/", label: "მთავარი", icon: "🏠" },
  { to: "/jobs", label: "სამუშაოები", icon: "🧾" },
  { to: "/loading", label: "დატვირთვა", icon: "🚚" },
  { to: "/periods", label: "პერიოდები", icon: "👷" }
];

const TOP_NAV = [
  { to: "/groups", label: "ჯგუფები" },
  { to: "/templates", label: "შაბლონები" },
  { to: "/settings", label: "პარამეტრები" }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__topbar">
        {TOP_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `app-shell__top-link${isActive ? " app-shell__top-link--active" : ""}`}
          >
            {item.label}
          </NavLink>
        ))}
      </header>

      <main className="app-shell__content">
        <Suspense fallback={<div className="app-shell__loading">იტვირთება…</div>}>
          <Outlet />
        </Suspense>
      </main>

      <nav className="app-shell__bottom-nav" aria-label="მთავარი ნავიგაცია">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `app-shell__nav-item${isActive ? " app-shell__nav-item--active" : ""}`}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
