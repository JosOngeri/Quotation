import React, { useState } from 'react';

interface MobileNavigationProps {
  menuItems: {
    label: string;
    path: string;
    icon?: string;
  }[];
  onNavigate: (path: string) => void;
  currentPath: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  menuItems,
  onNavigate,
  currentPath
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setIsOpen(false);
  };

  return (
    <div className="mobile-navigation">
      <button
        className="hamburger-menu"
        onClick={toggleMenu}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <span className={`hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`hamburger-line ${isOpen ? 'open' : ''}`}></span>
        <span className={`hamburger-line ${isOpen ? 'open' : ''}`}></span>
      </button>

      <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
        <nav className="mobile-nav">
          <ul className="mobile-nav-list">
            {menuItems.map((item) => (
              <li key={item.path} className="mobile-nav-item">
                <button
                  onClick={() => handleNavigate(item.path)}
                  className={`mobile-nav-link ${currentPath === item.path ? 'active' : ''}`}
                >
                  {item.icon && <span className="nav-icon">{item.icon}</span>}
                  <span className="nav-label">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {isOpen && (
        <div className="mobile-menu-overlay" onClick={toggleMenu}></div>
      )}
    </div>
  );
};

export default MobileNavigation;