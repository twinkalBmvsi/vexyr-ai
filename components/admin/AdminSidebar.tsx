"use client";

import Link from "next/link";
import { useState } from "react";

export default function AdminSidebar() {
  const [activeLink, setActiveLink] = useState("businesses");

  const navItems = [
    { id: "businesses", label: "Businesses", icon: "◆" },
    { id: "services", label: "Services", icon: "◇" },
    { id: "subscriptions", label: "Subscriptions", icon: "◈" },
    { id: "settings", label: "Settings", icon: "◉" },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          vex<span>yr</span>
        </Link>
        <div className="sidebar-subtitle">Admin Portal</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`/admin/${item.id}`}
            className={`sidebar-link ${activeLink === item.id ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveLink(item.id);
            }}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">AD</div>
          <div className="user-info">
            <div className="user-name">Admin User</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>
        <Link href="/" className="sidebar-logout">
          ← Back to Site
        </Link>
      </div>
    </aside>
  );
}
