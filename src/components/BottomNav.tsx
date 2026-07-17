import { NavLink } from 'react-router-dom'

export function TopNav() {
  return (
    <nav className="top-nav no-print">
      <NavLink to="/" end className="brand display">
        The Solomons <em>Cook</em>
      </NavLink>
      <div className="top-links">
        <NavLink to="/" end>
          Recipes
        </NavLink>
        <NavLink to="/plan">Plan</NavLink>
        <NavLink to="/list">List</NavLink>
        <NavLink to="/add" className="top-add">
          + Add recipe
        </NavLink>
      </div>
    </nav>
  )
}

export function BottomNav() {
  return (
    <nav className="bottom-nav no-print">
      <NavLink to="/" end>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        Recipes
      </NavLink>
      <NavLink to="/plan">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="17" rx="2.5" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Plan
      </NavLink>
      <NavLink to="/add">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="var(--terracotta)" />
          <path d="M12 7.5v9M7.5 12h9" stroke="var(--cream)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Add
      </NavLink>
      <NavLink to="/list">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 5.5l1.5 1.5L7.5 4" />
          <path d="M3.5 12.5l1.5 1.5L7.5 11" />
          <path d="M3.5 19.5l1.5 1.5L7.5 18" />
          <line x1="11" y1="6" x2="20.5" y2="6" />
          <line x1="11" y1="13" x2="20.5" y2="13" />
          <line x1="11" y1="20" x2="20.5" y2="20" />
        </svg>
        List
      </NavLink>
    </nav>
  )
}
