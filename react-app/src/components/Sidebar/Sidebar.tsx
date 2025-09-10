import classNames from "classnames";
import React, { CSSProperties, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Styles.module.scss"
import { FaHome, } from "react-icons/fa";
import { FaGear, } from "react-icons/fa6";
import { BsFileEarmarkCheck } from "react-icons/bs";
import { GiKnifeFork } from "react-icons/gi";

export type SidebarProps = {
  className?: string;
  style?: CSSProperties
};

const Sidebar: React.FC<SidebarProps> = ({ className = "", style = {} }) => {


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
          <Link to="/recipe_add" className={styles.Link} aria-current="page" title="Add recipe">
            <BsFileEarmarkCheck />
          </Link>
        </li>
        <li>
          <Link to="/settings" className={styles.Link}>
            <FaGear />
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;
