import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  FolderKanban, 
  MoreHorizontal 
} from 'lucide-react';

interface BottomNavigationProps {
  onMoreClick?: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ onMoreClick }) => {
  const location = useLocation();

  const navItems = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutDashboard,
      label: 'Home'
    },
    { 
      name: 'Quotes', 
      href: '/quotes', 
      icon: FileText,
      label: 'Quotes'
    },
    { 
      name: 'Projects', 
      href: '/projects', 
      icon: FolderKanban,
      label: 'Projects'
    },
    { 
      name: 'More', 
      href: '#', 
      icon: MoreHorizontal,
      label: 'More',
      action: true
    },
  ];

  const handleNavClick = (item: any) => {
    if (item.action && onMoreClick) {
      onMoreClick();
    }
  };

  return (
    <nav className="bottom-navigation">
      <div className="bottom-nav-container">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => handleNavClick(item)}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="nav-icon-container">
                <Icon className="nav-icon" />
              </div>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;