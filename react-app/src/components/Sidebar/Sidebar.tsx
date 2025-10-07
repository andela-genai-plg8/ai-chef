import classNames from "classnames";
import React, { CSSProperties, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import styles from "./Styles.module.scss"
import { FaHome, } from "react-icons/fa";
import { FaGear, } from "react-icons/fa6";
import { BsFileEarmarkCheck } from "react-icons/bs";
import { GiKnifeFork } from "react-icons/gi";
import { LuLogOut, LuLogIn } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";

export type SidebarProps = {
  className?: string;
  style?: CSSProperties
};

const Sidebar: React.FC<SidebarProps> = ({ className = "", style = {} }) => {
  const location = useLocation();
  const { user, signOut, setPreviousPath } = useAuth(location.pathname);
  const navigate = useNavigate();

  return (
    <nav className={classNames(styles.Sidebar, className)} style={{ ...style }}>
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
        <li>
          <Link to="/settings" className={styles.Link}>
            <FaGear />
          </Link>
        </li>
        {
          user && <li className={styles.Logout}>
            <a href="/" onClick={async (e) => {
              e.preventDefault();
              await signOut();
              // show a modal informing the user they have signed out?
              return navigate("/");
            }} className={classNames(styles.Link)} title="Log out">
              <LuLogOut />
            </a>
          </li>
        }

        {
          !user && <li className={styles.Logout}>
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
    </nav>
  );
};

export default Sidebar;
