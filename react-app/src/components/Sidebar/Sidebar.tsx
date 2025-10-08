import classNames from "classnames";
import React, { CSSProperties, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./Styles.module.scss"
import { FaHome, } from "react-icons/fa";
import { FaGear, } from "react-icons/fa6";
import { BsFileEarmarkCheck } from "react-icons/bs";
import { GiKnifeFork } from "react-icons/gi";
import { LuLogOut, LuLogIn } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from 'react-responsive';
import { GiHamburgerMenu } from "react-icons/gi";

export type SidebarProps = {
  className?: string;
  style?: CSSProperties;
  /** Optional callback to report the current pixel width of the sidebar (useful for layout calculations). */
  onWidthChange?: (width: number) => void;
};

const Sidebar: React.FC<SidebarProps> = ({ className = "", style = {}, onWidthChange }) => {
  const location = useLocation();
  const { user, signOut, setPreviousPath } = useAuth(location.pathname);
  const navigate = useNavigate();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [isMenuOpen, setIsMenuOpen] = useState(!isMobile);
  const navRef = React.useRef<HTMLElement | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // report width when menu open/closed or on resize
  React.useEffect(() => {
    if (!onWidthChange) return;
    const report = () => {
      const el = navRef.current as HTMLElement | null;
      if (el) onWidthChange(el.offsetWidth || 0);
    };

    report();
    window.addEventListener('resize', report);
    return () => window.removeEventListener('resize', report);
  }, [isMenuOpen, onWidthChange]);

  return (
    <nav ref={navRef} className={classNames(styles.Sidebar, className, { [styles.Closed]: !isMenuOpen })} style={{ ...style }}>
      {
        isMobile && <div className={styles.HamburgerMenu} onClick={() => setIsMenuOpen(!isMenuOpen)} title="Menu">
          <GiHamburgerMenu />
        </div>
      }
      {
        (isMenuOpen || !isMobile) && (
          <ul>
            <li>
              <Link to="/" className={styles.Link} aria-current="page">
                <FaHome />
              </Link>
            </li>
            <li>
              <Link to="/recipes" className={styles.Link} aria-current="page">
                <GiKnifeFork />
              </Link>
            </li>
            <li>
              <Link to="/recipes/new" className={styles.Link} aria-current="page" title="Add recipe">
                <BsFileEarmarkCheck />
              </Link>
            </li>
            <li className={styles.PushDown}>
              <hr />
            </li>
            {
              user &&
              <li>
                <Link to="/settings" className={styles.Link}>
                  <FaGear />
                </Link>
              </li>
            }

            {
              user?.uid && <li className={styles.Logout}>
                <a href="/" onClick={(e) => {
                  e.preventDefault();
                  // show confirmation modal
                  setShowLogoutConfirm(true);
                }} className={classNames(styles.Link)} title="Log out">
                  <LuLogOut />
                </a>
              </li>
            }

            {
              !user?.uid && <li className={styles.Logout}>
                <a href="#" title="Log in" onClick={(e) => {
                  e.preventDefault();
                  setPreviousPath(location.pathname);
                  return navigate("/login");
                }} className={classNames(styles.Link)}>
                  <LuLogIn />
                </a>
              </li>
            }
          </ul>
        )
      }
      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }} onClick={() => setShowLogoutConfirm(false)}>
          <div style={{ background: 'white', color: "black", padding: '1rem 1.25rem', borderRadius: 8, minWidth: 280 }} onClick={(e) => e.stopPropagation()}>
            <h5>Confirm sign out</h5>
            <p>Are you sure you want to sign out?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className={styles.PrimaryButton} onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className={styles.SecondaryButton} onClick={async () => {
                try {
                  await signOut();
                } catch (err) {
                  // ignore signout errors — still navigate
                }
                setShowLogoutConfirm(false);
                navigate('/');
              }}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Sidebar;
