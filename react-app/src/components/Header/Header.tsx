
import React, { CSSProperties, useState } from "react";
import styles from "./Styles.module.scss";
import TopMenu from "../TopMenu/TopMenu";
import classNames from "classnames";

export type SidebarProps = {
  className?: string;
  style?: CSSProperties
  personal?: boolean;
  title?: string;
};

const Header: React.FC<SidebarProps> = ({ className = "", style = {}, personal, title }) => {

  return (
    <div className={classNames(styles.Header, className)} style={style}>
      <div className={styles.HeaderContainer}>
        <TopMenu className={styles.TopMenu} personal={personal} />

        {
          title && <div className={styles.Title}>
            <h1>{title}</h1>
          </div>
        }
      </div>

      {/* <Search className={styles.Search} /> */}
    </div>
  );
};

export default Header;
