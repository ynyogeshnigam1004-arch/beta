import { Link, useLocation } from 'react-router-dom'
import { FiHome, FiUsers, FiPhone, FiSettings, FiActivity, FiCreditCard, FiTool } from 'react-icons/fi'
import './Sidebar.css'

function Sidebar({ isOpen, onToggle }) {
  const location = useLocation()

  const menuItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/assistants', icon: FiUsers, label: 'Assistants' },
    { path: '/tools', icon: FiTool, label: 'Tools' },
    { path: '/phone-numbers', icon: FiPhone, label: 'Phone Numbers' },
    { path: '/call/new', icon: FiPhone, label: 'Make Call' },
    { path: '/analytics', icon: FiActivity, label: 'Analytics' },
    { path: '/billing', icon: FiCreditCard, label: 'Billing' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
  ]

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-content">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <item.icon className="sidebar-icon" />
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  )
}

export default Sidebar

