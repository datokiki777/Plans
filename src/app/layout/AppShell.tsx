import { Suspense } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { isOnSection } from "./navigation";
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
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="app-shell__topbar">
        {TOP_NAV.map((item) => {
          const active = isOnSection(location.pathname, item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`app-shell__top-link${active ? " app-shell__top-link--active" : ""}`}
              onClick={(e) => {
                // A toggle, not a plain link: tapping the already-open
                // section closes it back to home instead of doing
                // nothing (the default for a link to the current route).
                if (active) {
                  e.preventDefault();
                  navigate("/");
                }
              }}
            >
              {item.label}
            </NavLink>
          );
        })}
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
