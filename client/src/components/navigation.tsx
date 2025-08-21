import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-airbnb-red">Verőce Hills</h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection("features")}
              className="text-airbnb-gray hover:text-airbnb-dark transition-colors"
              data-testid="nav-features"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection("gallery")}
              className="text-airbnb-gray hover:text-airbnb-dark transition-colors"
              data-testid="nav-gallery"
            >
              Gallery
            </button>
            <button 
              onClick={() => scrollToSection("booking")}
              className="text-airbnb-gray hover:text-airbnb-dark transition-colors"
              data-testid="nav-booking"
            >
              Book Now
            </button>
          </div>
          
          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-airbnb-dark" />
            ) : (
              <Menu className="h-6 w-6 text-airbnb-dark" />
            )}
          </button>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button 
                onClick={() => scrollToSection("features")}
                className="block px-3 py-2 text-airbnb-gray hover:text-airbnb-dark transition-colors w-full text-left"
                data-testid="mobile-nav-features"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection("gallery")}
                className="block px-3 py-2 text-airbnb-gray hover:text-airbnb-dark transition-colors w-full text-left"
                data-testid="mobile-nav-gallery"
              >
                Gallery
              </button>
              <button 
                onClick={() => scrollToSection("booking")}
                className="block px-3 py-2 text-airbnb-gray hover:text-airbnb-dark transition-colors w-full text-left"
                data-testid="mobile-nav-booking"
              >
                Book Now
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
