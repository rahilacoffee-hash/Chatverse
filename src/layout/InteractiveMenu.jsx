import React, { useState, useRef, useEffect, useMemo } from "react";
import { Home, Briefcase, Calendar, Shield, Settings } from "lucide-react";

const defaultItems = [
  { label: "home", icon: Home },
  { label: "strategy", icon: Briefcase },
  { label: "period", icon: Calendar },
  { label: "security", icon: Shield },
  { label: "settings", icon: Settings },
];

const defaultAccentColor = "var(--component-active-color-default)";

export default function InteractiveMenu({
  items,
  accentColor,
}) {
  // validate items
  const finalItems = useMemo(() => {
    const isValid =
      Array.isArray(items) && items.length >= 2 && items.length <= 5;

    if (!isValid) return defaultItems;
    return items;
  }, [items]);

  const [activeIndex, setActiveIndex] = useState(0);

  const textRefs = useRef([]);
  const itemRefs = useRef([]);

  // reset active index if items change
  useEffect(() => {
    if (activeIndex >= finalItems.length) {
      setActiveIndex(0);
    }
  }, [finalItems, activeIndex]);

  // update underline width
  useEffect(() => {
    const updateLineWidth = () => {
      const itemEl = itemRefs.current[activeIndex];
      const textEl = textRefs.current[activeIndex];

      if (itemEl && textEl) {
        itemEl.style.setProperty(
          "--lineWidth",
          `${textEl.offsetWidth}px`
        );
      }
    };

    updateLineWidth();
    window.addEventListener("resize", updateLineWidth);

    return () => window.removeEventListener("resize", updateLineWidth);
  }, [activeIndex, finalItems]);

  const navStyle = useMemo(() => {
    return {
      "--component-active-color":
        accentColor || defaultAccentColor,
    };
  }, [accentColor]);

  return (
    <nav className="menu" style={navStyle}>
      {finalItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = index === activeIndex;

        return (
          <button
            key={item.label}
            className={`menu__item ${isActive ? "active" : ""}`}
            onClick={() => setActiveIndex(index)}
            ref={(el) => (itemRefs.current[index] = el)}
            style={{ "--lineWidth": "0px" }}
          >
            <div className="menu__icon">
              <Icon className="icon" />
            </div>

            <strong
              className={`menu__text ${isActive ? "active" : ""}`}
              ref={(el) => (textRefs.current[index] = el)}
            >
              {item.label}
            </strong>
          </button>
        );
      })}
    </nav>
  );
}