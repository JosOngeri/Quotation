import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  label: string;
}

interface BottomNavigationProps {
  items: NavItem[];
  moreItems: NavItem[];
  onMoreClick?: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ items, moreItems, onMoreClick }) => {
  const location = useLocation();

  const allItems = [
    ...items,
    ...moreItems
  ];

  const visibleItems = allItems.slice(0, 3);

  return (
    <nav className="bottom-navigation" aria-label="Bottom navigation">
      <div className="bottom-nav-container">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="nav-icon-container">
                <Icon className="nav-icon" aria-hidden="true" />
              </div>
              <span className="nav-label">{item.label || item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={onMoreClick}
          className="bottom-nav-item"
          aria-label="More options"
        >
          <div className="nav-icon-container">
            <MoreHorizontal className="nav-icon" aria-hidden="true" />
          </div>
          <span className="nav-label">More</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;
